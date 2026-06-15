import type { Database } from "sql.js";
import { findAllSections, findItemsBySectionId, findRootItemsBySectionId, findItemsByParentId, upsertSection, upsertItem, deleteItem, deleteSection as deleteSectionModel } from "../models/section";

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
}

export interface SectionData {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  items: ItemData[];
}

function mapItem(i: { id: string; parent_item_id: string | null; title: string; description: string | null; date: string | null; tags: string | null; body: string | null; url: string | null; meta_json: string | null }): ItemData {
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
  };
}

export function getSections(db: Database): SectionData[] {
  const sections = findAllSections(db);
  return sections.map((s) => ({
    id: s.id,
    label: s.label,
    type: s.type,
    items: findItemsBySectionId(db, s.id).map(mapItem),
  }));
}

export function getRootItems(db: Database, sectionId: string): ItemData[] {
  return findRootItemsBySectionId(db, sectionId).map(mapItem);
}

export function getChildItems(db: Database, parentId: string): ItemData[] {
  return findItemsByParentId(db, parentId).map(mapItem);
}

export function saveSection(db: Database, section: { id: string; label: string; type: "file" | "folder" | "terminal"; sort_order?: number }) {
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
