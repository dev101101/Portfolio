import type { Database } from "sql.js";
import initSqlJs from "sql.js";
import { getProfile as getProfileCtrl } from "./controllers/profile";
import { getSections as getSectionsCtrl, getRootItems as getRootItemsCtrl, getChildItems as getChildItemsCtrl } from "./controllers/section";
import { seed } from "./seed";

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

const DB_STORAGE_KEY = "portfolio-database";

function loadDbFromStorage(): Uint8Array | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return null;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function saveDbToStorage(d: Database) {
  try {
    const data = d.export();
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]!);
    }
    localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
  } catch { /* ignore */ }
}

function initSqlite(): Promise<Database> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
const SQL = await initSqlJs({
  locateFile: (file: string) => `/${file}`,
});
    const saved = loadDbFromStorage();
    const d = saved ? new SQL.Database(saved) : new SQL.Database();
    d.run("PRAGMA page_size = 4096");
      if (!saved) {
        d.run(`
          CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            avatar TEXT NOT NULL,
            name TEXT NOT NULL,
            tagline TEXT NOT NULL,
            bio TEXT NOT NULL,
            skills TEXT NOT NULL
          )
        `);
        d.run(`
          CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('file', 'folder', 'terminal')),
            sort_order INTEGER NOT NULL DEFAULT 0
          )
        `);
        d.run(`
          CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
            parent_item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT,
            tags TEXT,
            body TEXT,
            url TEXT,
            meta_json TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0
          )
        `);
      }
      // migrate existing databases — add columns if not present
      const pCols = d.exec("PRAGMA table_info(profile)");
      const pColNames = pCols[0]?.values.map((v) => v[1]) ?? [];
      if (!pColNames.includes("tagline_es")) {
        d.run("ALTER TABLE profile ADD COLUMN tagline_es TEXT");
      }
      if (!pColNames.includes("bio_es")) {
        d.run("ALTER TABLE profile ADD COLUMN bio_es TEXT");
      }

      const sCols = d.exec("PRAGMA table_info(sections)");
      const sColNames = sCols[0]?.values.map((v) => v[1]) ?? [];
      if (!sColNames.includes("label_es")) {
        d.run("ALTER TABLE sections ADD COLUMN label_es TEXT");
      }

      const iCols = d.exec("PRAGMA table_info(items)");
      const iColNames = iCols[0]?.values.map((v) => v[1]) ?? [];
      if (!iColNames.includes("parent_item_id")) {
        d.run("ALTER TABLE items ADD COLUMN parent_item_id TEXT REFERENCES items(id) ON DELETE CASCADE");
      }
      if (!iColNames.includes("title_es")) {
        d.run("ALTER TABLE items ADD COLUMN title_es TEXT");
      }
      if (!iColNames.includes("description_es")) {
        d.run("ALTER TABLE items ADD COLUMN description_es TEXT");
      }
      if (!iColNames.includes("body_es")) {
        d.run("ALTER TABLE items ADD COLUMN body_es TEXT");
      }
      seed(d);
      saveDbToStorage(d);
    db = d;
    return d;
  })();
  return initPromise;
}

export function persistDb() {
  if (db) saveDbToStorage(db);
}

export function initDb(): Database | null {
  if (db) return db;
  initSqlite();
  return null;
}

export { initSqlite as initDbAsync };

export interface PageItem {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
  body?: string;
  url?: string;
  meta?: Record<string, string>;
  parentItemId?: string;
}

export interface Section {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  items: PageItem[];
}

export interface Profile {
  avatar: string;
  name: string;
  tagline: string;
  bio: string;
  skills: string[];
}

function pickLang(valEn: string, valEs: string | null | undefined, lang: string): string {
  if (lang === "es" && valEs != null) return valEs;
  return valEn;
}

function getLang(): string {
  try {
    return localStorage.getItem("portfolio-lang") || "en";
  } catch {
    return "en";
  }
}

export function getProfile(lang?: string): Profile {
  if (!db) return { avatar: "", name: "", tagline: "", bio: "", skills: [] };
  const p = getProfileCtrl(db);
  const l = lang ?? getLang();
  if (!p) return { avatar: "", name: "", tagline: "", bio: "", skills: [] };
  return {
    avatar: p.avatar,
    name: p.name,
    tagline: pickLang(p.tagline, (p as Record<string, unknown>).tagline_es as string | null, l),
    bio: pickLang(p.bio, (p as Record<string, unknown>).bio_es as string | null, l),
    skills: p.skills,
  };
}

export function getSections(lang?: string): Section[] {
  if (!db) return [];
  const l = lang ?? getLang();
  return getSectionsCtrl(db).map((s) => ({
    id: s.id,
    label: pickLang(s.label, (s as Record<string, unknown>).label_es as string | null, l),
    type: s.type,
    items: s.items.map((i) => ({
      id: i.id,
      title: pickLang(i.title, (i as Record<string, unknown>).title_es as string | null, l),
      description: pickLang(i.description ?? "", (i as Record<string, unknown>).description_es as string | null, l) || undefined,
      date: i.date,
      tags: i.tags,
      body: pickLang(i.body ?? "", (i as Record<string, unknown>).body_es as string | null, l) || undefined,
      url: i.url,
      meta: i.meta,
      parentItemId: i.parentItemId,
    })),
  }));
}

export function getRootItems(sectionId: string, lang?: string): PageItem[] {
  if (!db) return [];
  const l = lang ?? getLang();
  return getRootItemsCtrl(db, sectionId).map((i) => ({
    id: i.id,
    title: pickLang(i.title, (i as Record<string, unknown>).title_es as string | null, l),
    description: pickLang(i.description ?? "", (i as Record<string, unknown>).description_es as string | null, l) || undefined,
    date: i.date,
    tags: i.tags,
    body: pickLang(i.body ?? "", (i as Record<string, unknown>).body_es as string | null, l) || undefined,
    url: i.url,
    meta: i.meta,
    parentItemId: i.parentItemId,
  }));
}

export function getChildItems(parentId: string, lang?: string): PageItem[] {
  if (!db) return [];
  const l = lang ?? getLang();
  const results = getChildItemsCtrl(db, parentId);
  return results.map((i) => ({
    id: i.id,
    title: pickLang(i.title, (i as Record<string, unknown>).title_es as string | null, l),
    description: pickLang(i.description ?? "", (i as Record<string, unknown>).description_es as string | null, l) || undefined,
    date: i.date,
    tags: i.tags,
    body: pickLang(i.body ?? "", (i as Record<string, unknown>).body_es as string | null, l) || undefined,
    url: i.url,
    meta: i.meta,
    parentItemId: i.parentItemId,
  }));
}
