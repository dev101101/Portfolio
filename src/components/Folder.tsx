import { useCallback } from "react";
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

export interface FolderItem {
  name: string;
  type: "file" | "folder" | "terminal";
  detail: ReactNode;
  description?: string;
  url?: string;
}

interface FolderProps {
  items: FolderItem[];
  theme: string;
  onOpenFile?: (title: string, detail: ReactNode) => void;
  onSelectFolder?: (name: string) => void;
  sectionId?: string;
  dragDisabled?: boolean;
}

function Folder({ items, theme, onOpenFile, onSelectFolder, sectionId, dragDisabled }: FolderProps) {
  const FolderIcon = theme === "pixel" ? PixelFolder :
    theme === "classic" ? ClassicFolder :
    theme === "terminal" ? TerminalFolder :
    ModernFolder;

  const FileIcon = theme === "pixel" ? PixelFile :
    theme === "classic" ? ClassicFile :
    theme === "terminal" ? TerminalFile :
    ModernFile;

  const handleDragStart = useCallback((e: React.DragEvent, itemName: string) => {
    if (!sectionId) return;
    e.dataTransfer.setData("text/plain", JSON.stringify({ sectionId, itemName }));
    e.dataTransfer.effectAllowed = "move";
  }, [sectionId]);

  return (
    <div className="window-content-inner">
      <div className="filebrowser-list" role="list">
        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="filebrowser-item"
            role="listitem"
            tabIndex={0}
            draggable={!!sectionId && !dragDisabled}
            onDragStart={(e) => handleDragStart(e, item.name)}
            onDoubleClick={() => {
              if (item.url) {
                window.open(item.url, "_blank");
              } else if (item.type === "folder") {
                onSelectFolder?.(item.name);
              } else {
                onOpenFile?.(item.name, item.detail);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (item.url) {
                  window.open(item.url, "_blank");
                } else if (item.type === "folder") {
                  onSelectFolder?.(item.name);
                } else {
                  onOpenFile?.(item.name, item.detail);
                }
              }
            }}
          >
            {item.type === "folder" ? <FolderIcon /> : <FileIcon />}
            <div>
              <div className="filebrowser-item-name" title={item.name}>{item.name}</div>
              {item.description && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--content-subtitle)", marginTop: 2 }}>
                  {item.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Folder;
