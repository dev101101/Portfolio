import { useState, useEffect, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import {
  PixelFolder,
  ClassicFolder,
  ModernFolder,
  TerminalFolder,
  PixelFile,
  ClassicFile,
  ModernFile,
  TerminalFile,
} from "./FolderSvgs";
import { getSections, getRootItems, getChildItems, type PageItem, initDb, persistDb } from "../data/db";
import { saveItem, removeItem } from "../data/controllers/section";
import { findItemsBySectionId } from "../data/models/section";
import { fetchBlogList, fetchBlogArticle, mapDevtoToPageItem } from "../data/blog-api";
import { PROTECTED_IDS } from "../data/constants";
import Folder from "./Folder";
import File from "./File";
import ContentPage from "./ContentPage";
import ItemEditor from "./ItemEditor";
import type { FolderItem } from "./Folder";

function BlogArticleWrapper({ articleId, title, description, tags, date, url, coverImage }: {
  articleId: number;
  title: string;
  description?: string;
  tags?: string[];
  date?: string;
  url?: string;
  coverImage?: string;
}) {
  const [article, setArticle] = useState<PageItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBlogArticle(articleId).then((data) => {
      if (cancelled) return;
      setArticle(mapDevtoToPageItem(
        { id: articleId, title, description: description ?? "", published_at: "", url: url ?? "", tag_list: tags ?? [], cover_image: coverImage ?? null },
        data.body_markdown,
      ));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [articleId, title, description, tags, date, url, coverImage]);

  if (loading) {
    return (
      <div className="window-content-inner">
        <div className="blog-article-loading">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="window-content-inner">
        <div className="blog-article-error">Failed to load article.</div>
      </div>
    );
  }

  return <ContentPage item={article} />;
}

interface ExplorerSection {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  items: FolderItem[];
}

interface NavEntry {
  sectionId: string;
  label: string;
  parentItemId?: string;
}

function buildItemsFrom(items: PageItem[], sectionId: string): FolderItem[] {
  const isProtected = PROTECTED_IDS.includes(sectionId);
  return items.map((item) => ({
    id: item.id,
    name: item.title,
    type: (item.meta?.["itemType"] as "file" | "folder" | undefined) ?? "file",
    description: item.description,
    url: item.url,
    detail: isProtected
      ? <ContentPage item={item} />
      : <ItemEditor sectionId={sectionId} itemName={item.title} />,
  }));
}

function buildBlogItems(articles: Awaited<ReturnType<typeof fetchBlogList>>): FolderItem[] {
  return articles.map((a) => ({
    name: a.title,
    type: "file" as const,
    description: a.description,
    url: a.url,
    detail: (
      <BlogArticleWrapper
        articleId={a.id}
        title={a.title}
        description={a.description}
        tags={a.tag_list}
        date={new Date(a.published_at).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        })}
        url={a.url}
        coverImage={a.cover_image ?? undefined}
      />
    ),
  }));
}

function getExplorerSections(): ExplorerSection[] {
  const raw = getSections();
  if (raw.length === 0) return [];
  return raw.map((s) => ({
    id: s.id,
    label: s.label,
    type: s.type,
    items:
      s.id === "about"
        ? s.items.map((item) => ({
            name: item.title,
            type: "file" as const,
            description: item.description,
            detail: <ContentPage item={item} />,
          }))
        : buildItemsFrom(s.items, s.id),
  }));
}

function getItemsForNav(sectionId: string, parentItemId?: string): FolderItem[] {
  if (!parentItemId) {
    const rootItems = getRootItems(sectionId);
    return buildItemsFrom(rootItems, sectionId);
  }
  const childItems = getChildItems(parentItemId);
  return buildItemsFrom(childItems, sectionId);
}

let nameCounter = 0;
function uniqueItemName(base: string, existing: FolderItem[]): string {
  const names = new Set(existing.map((i) => i.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

interface FileExplorerProps {
  initialSection?: string;
  theme: string;
  onPathChange?: (path: string) => void;
  onOpenFile?: (title: string, detail: ReactNode) => void;
  onOpenSection?: (id: string) => void;
  onOpenAbout?: () => void;
  onOpenItem?: (sectionId: string, itemId: string, itemName: string) => void;
}

function FileExplorer({
  initialSection,
  theme,
  onPathChange,
  onOpenFile,
  onOpenAbout,
  onOpenSection,
  onOpenItem,
}: FileExplorerProps) {
  const FolderIcon =
    theme === "pixel"
      ? PixelFolder
      : theme === "classic"
        ? ClassicFolder
        : theme === "terminal"
          ? TerminalFolder
          : ModernFolder;

  const FileIcon =
    theme === "pixel"
      ? PixelFile
      : theme === "classic"
        ? ClassicFile
        : theme === "terminal"
          ? TerminalFile
          : ModernFile;

  const [staticSections] = useState<ExplorerSection[]>(() => getExplorerSections());
  const [blogItems, setBlogItems] = useState<FolderItem[] | null>(null);
  const [blogLoading, setBlogLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchBlogList()
      .then((articles) => {
        if (cancelled) return;
        if (articles.length > 0) {
          setBlogItems(buildBlogItems(articles));
        }
      })
      .catch(() => {
        // fall back to seed data
      })
      .finally(() => {
        if (!cancelled) setBlogLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(() => {
    if (!blogItems) return staticSections;
    return staticSections.map((s) =>
      s.id === "blog" ? { ...s, items: blogItems } : s,
    );
  }, [staticSections, blogItems]);

  const initialSectionId =
    initialSection &&
    initialSection !== "about" &&
    sections.some((s) => s.id === initialSection)
      ? initialSection
      : (sections[0]?.id ?? "");
  const [selectedSection, setSelectedSection] = useState(initialSectionId);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Navigation stack for nested folders
  const [navStack, setNavStack] = useState<NavEntry[]>([]);

  const currentNav = navStack.length > 0 ? navStack[navStack.length - 1] : undefined;
  const currentSectionId = currentNav?.sectionId ?? selectedSection;
  const currentParentItemId = currentNav?.parentItemId;

  const section = sections.find((s) => s.id === currentSectionId);

  // Current items: root items or items under current parent
  const currentItems = useMemo(() => {
    void refreshKey;
    const sec = sections.find((s) => s.id === currentSectionId);
    if (!sec) return [];
    if (PROTECTED_IDS.includes(currentSectionId)) {
      return sec.items;
    }
    const items = getItemsForNav(currentSectionId, currentParentItemId);
    return items;
  }, [currentSectionId, currentParentItemId, sections, refreshKey]);

  useEffect(() => {
    if (selectedItem) {
      onPathChange?.(`Desktop › ${section?.label ?? ""} › ${selectedItem}`);
    } else {
      const path = navStack.map((n) => n.label).join(" › ");
      onPathChange?.(`Desktop › ${section?.label ?? ""}${path ? ` › ${path}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection, selectedItem, section?.label, navStack]);

  const handleSectionClick = (id: string) => {
    if (id === "about") {
      onOpenAbout?.();
      return;
    }
    const sec = sections.find((s) => s.id === id);
    if (sec?.type === "file") {
      onOpenSection?.(id);
      return;
    }
    setSelectedSection(id);
    setSelectedItem(null);
    setNavStack([]);
  };

  const handleSelectFolder = useCallback((name: string) => {
    const item = currentItems.find((i) => i.name === name);
    if (!item || item.type !== "folder") {
      if (item && item.id && onOpenItem && !PROTECTED_IDS.includes(currentSectionId)) {
        onOpenItem(currentSectionId, item.id, item.name);
      } else if (item) {
        onOpenFile?.(item.name, item.detail);
      }
      return;
    }
    const db = initDb();
    let realId = `${currentSectionId}-${name}`;
    if (db) {
      const allItems = findItemsBySectionId(db, currentSectionId);
      const dbItem = allItems.find(
        (i) => i.title === name && i.parent_item_id === (currentParentItemId ?? null),
      );
      if (dbItem) realId = dbItem.id;
    }
    setNavStack((prev) => [...prev, { sectionId: currentSectionId, parentItemId: realId, label: name }]);
    setSelectedItem(null);
  }, [currentItems, currentSectionId, currentParentItemId, onOpenFile, onOpenItem]);

  const handleNavigateBack = useCallback(() => {
    setNavStack((prev) => prev.slice(0, -1));
    setSelectedItem(null);
  }, []);

  const handleCreateFile = useCallback((name: string) => {
    const db = initDb();
    if (!db) return;
    const cleanName = uniqueItemName(name, currentItems);
    const id = `file-${Date.now()}-${++nameCounter}`;
    saveItem(db, {
      id,
      section_id: currentSectionId,
      parent_item_id: currentParentItemId,
      title: cleanName,
      body: "",
      sort_order: 0,
    });
    persistDb();
    setRefreshKey((k) => k + 1);
  }, [currentSectionId, currentParentItemId, currentItems]);

  const handleCreateFolder = useCallback((name: string) => {
    const db = initDb();
    if (!db) return;
    const cleanName = uniqueItemName(name, currentItems);
    const id = `folder-${Date.now()}-${++nameCounter}`;
    saveItem(db, {
      id,
      section_id: currentSectionId,
      parent_item_id: currentParentItemId,
      title: cleanName,
      meta: { itemType: "folder" },
      sort_order: 0,
    });
    persistDb();
    setRefreshKey((k) => k + 1);
  }, [currentSectionId, currentParentItemId, currentItems]);

  const handleDeleteItem = useCallback((itemName: string) => {
    const db = initDb();
    if (!db) return;
    const allItems = findItemsBySectionId(db, currentSectionId);
    const dbItem = allItems.find(
      (i) => i.title === itemName && i.parent_item_id === (currentParentItemId ?? null),
    );
    if (!dbItem) return;
    removeItem(db, dbItem.id);
    persistDb();
    setRefreshKey((k) => k + 1);
  }, [currentSectionId, currentParentItemId]);

  const handleDropOnFolder = useCallback((targetFolderName: string, draggedItemName: string) => {
    const db = initDb();
    if (!db) return;
    const targetItem = currentItems.find((i) => i.name === targetFolderName && i.type === "folder");
    if (!targetItem) return;
    const allItems = findItemsBySectionId(db, currentSectionId);
    const targetDbItem = allItems.find((i) => i.title === targetFolderName && i.parent_item_id === (currentParentItemId ?? null));
    if (!targetDbItem) return;
    const draggedDbItem = allItems.find((i) => i.title === draggedItemName && i.parent_item_id === (currentParentItemId ?? null));
    if (!draggedDbItem) return;
    if (draggedDbItem.id === targetDbItem.id) return;
    saveItem(db, {
      id: draggedDbItem.id,
      section_id: currentSectionId,
      parent_item_id: targetDbItem.id,
      title: draggedDbItem.title,
      body: draggedDbItem.body ?? undefined,
      description: draggedDbItem.description ?? undefined,
      date: draggedDbItem.date ?? undefined,
      tags: draggedDbItem.tags ? JSON.parse(draggedDbItem.tags) : undefined,
      url: draggedDbItem.url ?? undefined,
      meta: draggedDbItem.meta_json ? JSON.parse(draggedDbItem.meta_json) : undefined,
      sort_order: draggedDbItem.sort_order,
    });
    persistDb();
    setRefreshKey((k) => k + 1);
  }, [currentSectionId, currentParentItemId, currentItems]);

  if (!section) {
    return (
      <div className="explorer">
        <div className="explorer-body">
          <div className="explorer-sidebar" role="tablist" aria-label="Sections">
            {sections.map((s) => (
              <div
                key={s.id}
                role="tab"
                tabIndex={0}
                aria-selected={s.id === selectedSection}
                className={`explorer-sidebar-item${s.id === selectedSection ? " active" : ""}`}
                onClick={() => handleSectionClick(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSectionClick(s.id); } }}
              >
                {s.type === "folder" ? <FolderIcon /> : <FileIcon />}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="explorer-content" role="tabpanel" aria-label="Content">
            {selectedSection === "blog" && blogLoading ? (
              <div className="blog-section-loading">Loading blog posts...</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer">
      <div className="explorer-body">
        <div className="explorer-sidebar" role="tablist" aria-label="Sections">
          {sections.map((s) => (
            <div
              key={s.id}
              role="tab"
              tabIndex={0}
              aria-selected={s.id === selectedSection}
              className={`explorer-sidebar-item${s.id === selectedSection ? " active" : ""}`}
              onClick={() => handleSectionClick(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSectionClick(s.id); } }}
            >
              {s.type === "folder" ? <FolderIcon /> : <FileIcon />}
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="explorer-content" role="tabpanel" aria-label="Content">
          {selectedSection === "blog" && blogLoading && !blogItems ? (
            <div className="blog-section-loading">Loading blog posts...</div>
          ) : selectedItem ? (
            <File
              detail={
                section.items.find((i) => i.name === selectedItem)?.detail
              }
              onBack={() => setSelectedItem(null)}
            />
          ) : (
            <>
              {/* Breadcrumb navigation */}
              {navStack.length > 0 && (
                <div
                  className="explorer-breadcrumb"
                  style={{
                    padding: "6px 12px",
                    borderBottom: "1px solid var(--border-color, #ccc)",
                    fontSize: "var(--font-size-xs)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    className="explorer-breadcrumb-back"
                    onClick={handleNavigateBack}
                    style={{ cursor: "pointer", fontWeight: "bold", color: "var(--accent-color, #06c)" }}
                  >
                    ← Back
                  </span>
                  <span style={{ color: "var(--content-subtitle, #666)" }}>
                    {navStack.map((n) => n.label).join(" › ")}
                  </span>
                </div>
              )}
              <Folder
                key={`${currentSectionId}-${currentParentItemId ?? "root"}-${refreshKey}`}
                items={currentItems}
                theme={theme}
                onOpenFile={onOpenFile}
                onSelectFolder={handleSelectFolder}
                sectionId={currentSectionId}
                dragDisabled={PROTECTED_IDS.includes(currentSectionId)}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                parentItemId={currentParentItemId}
                onDropOnFolder={handleDropOnFolder}
                onOpenItem={onOpenItem}
                onDeleteItem={handleDeleteItem}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;
