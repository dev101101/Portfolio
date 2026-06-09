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
}

function Folder({ items, theme, onOpenFile, onSelectFolder }: FolderProps) {
  const FolderIcon = theme === "pixel" ? PixelFolder :
    theme === "classic" ? ClassicFolder :
    theme === "terminal" ? TerminalFolder :
    ModernFolder;

  const FileIcon = theme === "pixel" ? PixelFile :
    theme === "classic" ? ClassicFile :
    theme === "terminal" ? TerminalFile :
    ModernFile;

  return (
    <div className="window-content-inner">
      <div className="filebrowser-list" role="list">
        {items.map((item) => (
          <div
            key={item.name}
            className="filebrowser-item"
            role="listitem"
            tabIndex={0}
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
