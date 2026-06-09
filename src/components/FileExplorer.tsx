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
import { getSections, type PageItem } from "../data/db";
import Folder from "./Folder";
import File from "./File";
import ContentPage from "./ContentPage";
import type { FolderItem } from "./Folder";

interface ExplorerSection {
  id: string;
  label: string;
  type: "file" | "folder" | "terminal";
  items: FolderItem[];
}

function buildItemsFrom(items: PageItem[]): FolderItem[] {
  return items.map((item) => ({
    name: item.title,
    type: "file" as const,
    description: item.description,
    url: item.url,
    detail: <ContentPage item={item} />,
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
        : buildItemsFrom(s.items),
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

  const sections = getExplorerSections();

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
          <div className="explorer-content" role="tabpanel" aria-label="Content" />
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
          {selectedItem ? (
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;
