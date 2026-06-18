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
  parent_item_id: string | null;
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

export function findRootItemsBySectionId(db: Database, sectionId: string): ItemRow[] {
  const stmt = db.prepare("SELECT * FROM items WHERE section_id = ? AND parent_item_id IS NULL ORDER BY sort_order");
  stmt.bind([sectionId]);
  const rows: ItemRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as ItemRow);
  }
  stmt.free();
  return rows;
}

export function findItemsByParentId(db: Database, parentId: string): ItemRow[] {
  const stmt = db.prepare("SELECT * FROM items WHERE parent_item_id = ? ORDER BY sort_order");
  stmt.bind([parentId]);
  const rows: ItemRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as ItemRow);
  }
  stmt.free();
  return rows;
}

export function upsertSection(
  db: Database,
  section: { id: string; label: string; type: "file" | "folder" | "terminal"; sort_order?: number; label_es?: string },
) {
  db.run(
    `INSERT INTO sections (id, label, type, sort_order, label_es)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       type = excluded.type,
       sort_order = excluded.sort_order,
       label_es = excluded.label_es`,
    [section.id, section.label, section.type, section.sort_order ?? 0, section.label_es ?? null],
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
    parent_item_id?: string;
    sort_order?: number;
    title_es?: string;
    description_es?: string;
    body_es?: string;
  },
) {
  const parentVal = item.parent_item_id ?? null;
  db.run(
    `INSERT INTO items (id, section_id, parent_item_id, title, description, date, tags, body, url, meta_json, sort_order, title_es, description_es, body_es)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       date = excluded.date,
       tags = excluded.tags,
       body = excluded.body,
       url = excluded.url,
       meta_json = excluded.meta_json,
       parent_item_id = excluded.parent_item_id,
       sort_order = excluded.sort_order,
       title_es = excluded.title_es,
       description_es = excluded.description_es,
       body_es = excluded.body_es`,
    [
      item.id,
      item.section_id,
      parentVal,
      item.title,
      item.description ?? null,
      item.date ?? null,
      item.tags ? JSON.stringify(item.tags) : null,
      item.body ?? null,
      item.url ?? null,
      item.meta ? JSON.stringify(item.meta) : null,
      item.sort_order ?? 0,
      item.title_es ?? null,
      item.description_es ?? null,
      item.body_es ?? null,
    ],
  );
}

export function deleteItem(db: Database, id: string) {
  db.run("DELETE FROM items WHERE id = ?", [id]);
}

export function findItemByNameAndParent(
  db: Database,
  sectionId: string,
  title: string,
  parentItemId: string | null = null,
): ItemRow | undefined {
  const rows = parentItemId === null
    ? findRootItemsBySectionId(db, sectionId)
    : findItemsByParentId(db, parentItemId);
  return rows.find((r) => r.title === title);
}

export function findChildrenRecursive(db: Database, itemId: string): ItemRow[] {
  const results: ItemRow[] = [];
  const queue = [itemId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    const children = findItemsByParentId(db, pid);
    for (const child of children) {
      results.push(child);
      if (child.meta_json) {
        try {
          const meta = JSON.parse(child.meta_json);
          if (meta?.itemType === "folder") queue.push(child.id);
        } catch { /* ignore */ }
      }
    }
  }
  return results;
}

export function deleteSection(db: Database, id: string) {
  db.run("DELETE FROM items WHERE section_id = ?", [id]);
  db.run("DELETE FROM sections WHERE id = ?", [id]);
}
