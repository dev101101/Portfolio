import { useState, useEffect, useMemo } from "react";
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
import { getSections, type PageItem } from "../data/db";
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

function buildItemsFrom(items: PageItem[], sectionId: string): FolderItem[] {
  const isProtected = PROTECTED_IDS.includes(sectionId as any);
  return items.map((item) => ({
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

interface FileExplorerProps {
  initialSection?: string;
  theme: string;
  onPathChange?: (path: string) => void;
  onOpenFile?: (title: string, detail: ReactNode) => void;
  onOpenAbout?: () => void;
}

function FileExplorer({
  initialSection,
  theme,
  onPathChange,
  onOpenFile,
  onOpenAbout,
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
  const [blogLoading, setBlogLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBlogLoading(true);
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

  const section = sections.find((s) => s.id === selectedSection);

  useEffect(() => {
    if (selectedItem) {
      onPathChange?.(`Desktop › ${section?.label ?? ""} › ${selectedItem}`);
    } else {
      onPathChange?.(`Desktop › ${section?.label ?? ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection, selectedItem, section?.label]);

  const handleSectionClick = (id: string) => {
    if (id === "about") {
      onOpenAbout?.();
      return;
    }
    setSelectedSection(id);
    setSelectedItem(null);
  };

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
            <Folder
              items={section.items}
              theme={theme}
              onOpenFile={onOpenFile}
              onSelectFolder={(name) => setSelectedItem(name)}
              sectionId={section.id}
              dragDisabled={PROTECTED_IDS.includes(section.id as any)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;
