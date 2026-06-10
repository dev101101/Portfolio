import type { Database } from "sql.js";
import initSqlJs from "sql.js";
import { getProfile as getProfileCtrl } from "./controllers/profile";
import { getSections as getSectionsCtrl } from "./controllers/section";
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
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
  body?: string;
  url?: string;
  meta?: Record<string, string>;
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

export function getProfile(): Profile {
  if (!db) return { avatar: "", name: "", tagline: "", bio: "", skills: [] };
  const p = getProfileCtrl(db);
  return p ?? { avatar: "", name: "", tagline: "", bio: "", skills: [] };
}

export function getSections(): Section[] {
  if (!db) return [];
  return getSectionsCtrl(db).map((s) => ({
    id: s.id,
    label: s.label,
    type: s.type,
    items: s.items.map((i) => ({
      title: i.title,
      description: i.description,
      date: i.date,
      tags: i.tags,
      body: i.body,
      url: i.url,
      meta: i.meta,
    })),
  }));
}
