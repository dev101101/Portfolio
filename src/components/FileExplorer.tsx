import { useState, useEffect } from "react";
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
import { getProjects } from "../data/db";

interface ExplorerItem {
  name: string;
  type: "file" | "folder";
  detail: ReactNode;
}

interface ExplorerSection {
  id: string;
  label: string;
  type: "file" | "folder";
  items?: ExplorerItem[];
}

const SECTIONS: ExplorerSection[] = [
  {
    id: "about",
    label: "About Me",
    type: "file",
  },
  {
    id: "projects",
    label: "Projects",
    type: "folder",
    items: getProjects().map((p) => ({
      name: p.name,
      type: "file" as const,
      detail: (
        <>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-family)",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            {p.readme}
          </pre>
          <div className="project-tech" style={{ marginTop: 12 }}>
            {p.topics.map((t) => (
              <span key={t} className="tech-tag">{t}</span>
            ))}
          </div>
        </>
      ),
    })),
  },
  {
    id: "blog",
    label: "Blog",
    type: "folder",
    items: [
      {
        name: "Building an OS-like Portfolio",
        type: "file",
        detail: (
          <>
            <time className="blog-date">2026-05-20</time>
            <h2>Building an OS-like Portfolio</h2>
            <p>How I created a desktop experience in the browser with React</p>
          </>
        ),
      },
      {
        name: "Rust for Web Developers",
        type: "file",
        detail: (
          <>
            <time className="blog-date">2026-04-10</time>
            <h2>Rust for Web Developers</h2>
            <p>A practical introduction to Rust from a TypeScript perspective</p>
          </>
        ),
      },
      {
        name: "The Art of CLI Design",
        type: "file",
        detail: (
          <>
            <time className="blog-date">2026-03-01</time>
            <h2>The Art of CLI Design</h2>
            <p>Lessons learned from building command-line interfaces</p>
          </>
        ),
      },
      {
        name: "Why I Love TypeScript",
        type: "file",
        detail: (
          <>
            <time className="blog-date">2026-01-15</time>
            <h2>Why I Love TypeScript</h2>
            <p>Type safety, developer experience, and productivity</p>
          </>
        ),
      },
    ],
  },
  {
    id: "github",
    label: "GitHub",
    type: "folder",
    items: [
      {
        name: "portfolio",
        type: "folder",
        detail: (
          <>
            <div className="repo-header">
              <strong>portfolio</strong>
              <span className="repo-stars">⭐ 42</span>
            </div>
            <p>OS-themed portfolio site</p>
            <span className="repo-lang">TypeScript</span>
          </>
        ),
      },
      {
        name: "cli-tools",
        type: "folder",
        detail: (
          <>
            <div className="repo-header">
              <strong>cli-tools</strong>
              <span className="repo-stars">⭐ 128</span>
            </div>
            <p>Collection of CLI utilities</p>
            <span className="repo-lang">Rust</span>
          </>
        ),
      },
      {
        name: "web-framework",
        type: "folder",
        detail: (
          <>
            <div className="repo-header">
              <strong>web-framework</strong>
              <span className="repo-stars">⭐ 89</span>
            </div>
            <p>Minimalist web framework</p>
            <span className="repo-lang">TypeScript</span>
          </>
        ),
      },
      {
        name: "dotfiles",
        type: "folder",
        detail: (
          <>
            <div className="repo-header">
              <strong>dotfiles</strong>
              <span className="repo-stars">⭐ 56</span>
            </div>
            <p>Personal dotfiles and config</p>
            <span className="repo-lang">Shell</span>
          </>
        ),
      },
    ],
  },
  {
    id: "speaking",
    label: "Speaking",
    type: "folder",
    items: [
      {
        name: "Building for the Browser @ JSConf 2026",
        type: "file",
        detail: (
          <>
            <div className="talk-meta">
              <span className="talk-event">JSConf 2026</span>
              <span className="talk-date">June 2026</span>
            </div>
            <h2>Building for the Browser</h2>
            <p>Modern strategies for building performant web applications</p>
          </>
        ),
      },
      {
        name: "Rust in Production @ RustConf 2025",
        type: "file",
        detail: (
          <>
            <div className="talk-meta">
              <span className="talk-event">RustConf 2025</span>
              <span className="talk-date">Sept 2025</span>
            </div>
            <h2>Rust in Production</h2>
            <p>Lessons from shipping Rust to production</p>
          </>
        ),
      },
      {
        name: "CLI Design Patterns @ DevToolCon 2025",
        type: "file",
        detail: (
          <>
            <div className="talk-meta">
              <span className="talk-event">DevToolCon 2025</span>
              <span className="talk-date">Mar 2025</span>
            </div>
            <h2>CLI Design Patterns</h2>
            <p>Designing command-line tools people love to use</p>
          </>
        ),
      },
    ],
  },
];

interface FileExplorerProps {
  initialSection?: string;
  theme: string;
  onPathChange?: (path: string) => void;
  onOpenFile?: (title: string, detail: ReactNode) => void;
  onOpenAbout?: () => void;
}

function FileExplorer({ initialSection, theme, onPathChange, onOpenFile, onOpenAbout }: FileExplorerProps) {
  const FolderIcon = theme === "pixel" ? PixelFolder :
    theme === "classic" ? ClassicFolder :
    theme === "terminal" ? TerminalFolder :
    ModernFolder;

  const FileIcon = theme === "pixel" ? PixelFile :
    theme === "classic" ? ClassicFile :
    theme === "terminal" ? TerminalFile :
    ModernFile;

  const initialSectionId =
    initialSection && initialSection !== "about" && SECTIONS.some((s) => s.id === initialSection)
      ? initialSection
      : SECTIONS[0]?.id ?? "";
  const [selectedSection, setSelectedSection] = useState(initialSectionId);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const section = SECTIONS.find((s) => s.id === selectedSection);

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

  if (!section) return null;

  return (
    <div className="explorer">
      <div className="explorer-body">
        {/* Sidebar */}
        <div className="explorer-sidebar">
          {SECTIONS.map((s) => (
            <div
              key={s.id}
              className={`explorer-sidebar-item${s.id === selectedSection ? " active" : ""}`}
              onClick={() => handleSectionClick(s.id)}
            >
              {s.type === "folder" ? <FolderIcon /> : <FileIcon />}
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content panel */}
        <div className="explorer-content">
          {selectedItem ? (
            <div className="window-content-inner">
              <button className="filebrowser-back" onClick={() => setSelectedItem(null)}>
                ← Back
              </button>
              {section.items?.find((i) => i.name === selectedItem)?.detail}
            </div>
          ) : (
            <div className="window-content-inner">
              <div className="filebrowser-list">
                {section.items?.map((item) => (
                  <div
                    key={item.name}
                    className="filebrowser-item"
                    onDoubleClick={() => {
                      if (item.type === "folder") {
                        setSelectedItem(item.name);
                      } else {
                        onOpenFile?.(item.name, item.detail);
                      }
                    }}
                  >
                    {item.type === "folder" ? <FolderIcon /> : <FileIcon />}
                    <span className="filebrowser-item-name">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;