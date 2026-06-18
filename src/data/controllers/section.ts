import type { Database } from "sql.js";
import { findAllSections, findItemsBySectionId, findRootItemsBySectionId, findItemsByParentId, type ItemRow, upsertSection, upsertItem, deleteItem, deleteSection as deleteSectionModel } from "../models/section";

export interface ItemData {
  id: string;
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
  body?: string;
  url?: string;
  meta?: Record<string, string>;
  parentItemId?: string;
  title_es?: string;
  description_es?: string;
  body_es?: string;
}

export interface SectionData {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  items: ItemData[];
  label_es?: string;
}

function mapItem(i: ItemRow): ItemData {
  return {
    id: i.id,
    title: i.title,
    description: i.description ?? undefined,
    date: i.date ?? undefined,
    tags: i.tags ? JSON.parse(i.tags) : undefined,
    body: i.body ?? undefined,
    url: i.url ?? undefined,
    meta: i.meta_json ? JSON.parse(i.meta_json) : undefined,
    parentItemId: i.parent_item_id ?? undefined,
    title_es: i.title_es,
    description_es: i.description_es,
    body_es: i.body_es,
  };
}

export function getSections(db: Database): SectionData[] {
  const sections = findAllSections(db);
  return sections.map((s) => ({
    id: s.id,
    label: s.label,
    type: s.type,
    items: findItemsBySectionId(db, s.id).map(mapItem),
    label_es: s.label_es,
  }));
}

export function getRootItems(db: Database, sectionId: string): ItemData[] {
  return findRootItemsBySectionId(db, sectionId).map(mapItem);
}

export function getChildItems(db: Database, parentId: string): ItemData[] {
  return findItemsByParentId(db, parentId).map(mapItem);
}

export function saveSection(db: Database, section: { id: string; label: string; type: "file" | "folder" | "terminal"; sort_order?: number; label_es?: string }) {
  upsertSection(db, section);
}

export function saveItem(
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
  upsertItem(db, item);
}

export function removeItem(db: Database, id: string) {
  deleteItem(db, id);
}

export function removeSection(db: Database, id: string) {
  deleteSectionModel(db, id);
}
