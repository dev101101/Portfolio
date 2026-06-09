import type { Database } from "sql.js";

export interface SectionRow {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  sort_order: number;
}

export interface ItemRow {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  date: string | null;
  tags: string | null;
  body: string | null;
  url: string | null;
  meta_json: string | null;
  sort_order: number;
}

export function findAllSections(db: Database): SectionRow[] {
  const stmt = db.prepare("SELECT * FROM sections ORDER BY sort_order");
  const rows: SectionRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as SectionRow);
  }
  stmt.free();
  return rows;
}

export function findSectionById(db: Database, id: string): SectionRow | undefined {
  const stmt = db.prepare("SELECT * FROM sections WHERE id = ?");
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as SectionRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function findItemsBySectionId(db: Database, sectionId: string): ItemRow[] {
  const stmt = db.prepare("SELECT * FROM items WHERE section_id = ? ORDER BY sort_order");
  stmt.bind([sectionId]);
  const rows: ItemRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as ItemRow);
  }
  stmt.free();
  return rows;
}

export function upsertSection(
  db: Database,
  section: { id: string; label: string; type: "file" | "folder" | "terminal"; sort_order?: number },
) {
  db.run(
    `INSERT INTO sections (id, label, type, sort_order)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       type = excluded.type,
       sort_order = excluded.sort_order`,
    [section.id, section.label, section.type, section.sort_order ?? 0],
  );
}

export function upsertItem(
  db: Database,
  item: {
    id: string;
    section_id: string;
    title: string;
    description?: string;
    date?: string;
    tags?: string[];
    body?: string;
    url?: string;
    meta?: Record<string, string>;
    sort_order?: number;
  },
) {
  db.run(
    `INSERT INTO items (id, section_id, title, description, date, tags, body, url, meta_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       date = excluded.date,
       tags = excluded.tags,
       body = excluded.body,
       url = excluded.url,
       meta_json = excluded.meta_json,
       sort_order = excluded.sort_order`,
    [
      item.id,
      item.section_id,
      item.title,
      item.description ?? null,
      item.date ?? null,
      item.tags ? JSON.stringify(item.tags) : null,
      item.body ?? null,
      item.url ?? null,
      item.meta ? JSON.stringify(item.meta) : null,
      item.sort_order ?? 0,
    ],
  );
}

export function deleteItem(db: Database, id: string) {
  db.run("DELETE FROM items WHERE id = ?", [id]);
}

export function deleteSection(db: Database, id: string) {
  db.run("DELETE FROM items WHERE section_id = ?", [id]);
  db.run("DELETE FROM sections WHERE id = ?", [id]);
}
