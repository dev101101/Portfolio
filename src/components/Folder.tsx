import { useCallback, useState, useRef, useEffect } from "react";
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
  id?: string;
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
  onCreateFile?: (name: string) => void;
  onCreateFolder?: (name: string) => void;
  parentItemId?: string;
  onDropOnFolder?: (targetFolderName: string, draggedItemName: string) => void;
  onOpenItem?: (sectionId: string, itemId: string, itemName: string) => void;
  onDeleteItem?: (itemName: string) => void;
}

let _dragData: { sectionId: string; itemName: string; parentItemId: string | null } | null = null;

function Folder({ items, theme, onOpenFile, onSelectFolder, sectionId, dragDisabled, onCreateFile, onCreateFolder, parentItemId, onDropOnFolder, onOpenItem, onDeleteItem }: FolderProps) {
  const FolderIcon = theme === "pixel" ? PixelFolder :
    theme === "classic" ? ClassicFolder :
    theme === "terminal" ? TerminalFolder :
    ModernFolder;

  const FileIcon = theme === "pixel" ? PixelFile :
    theme === "classic" ? ClassicFile :
    theme === "terminal" ? TerminalFile :
    ModernFile;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; item: FolderItem } | null>(null);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [dragOverName, setDragOverName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (dragDisabled) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [dragDisabled]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleNewFile = useCallback(() => {
    setContextMenu(null);
    setCreating("file");
    setNewName("");
  }, []);

  const handleNewFolder = useCallback(() => {
    setContextMenu(null);
    setCreating("folder");
    setNewName("");
  }, []);

  const handleCreateSubmit = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      setCreating(null);
      return;
    }
    if (creating === "file") {
      onCreateFile?.(name);
    } else {
      onCreateFolder?.(name);
    }
    setCreating(null);
    setNewName("");
  }, [newName, creating, onCreateFile, onCreateFolder]);

  const handleCreateBlur = useCallback(() => {
    setCreating(null);
    setNewName("");
  }, []);

  const handleCreateKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCreating(null);
      setNewName("");
    }
  }, [handleCreateSubmit]);

  const handleItemContextMenu = useCallback((e: React.MouseEvent, item: FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === "terminal") return;
    setItemContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  const closeItemContextMenu = useCallback(() => {
    setItemContextMenu(null);
  }, []);

  const handleItemOpen = useCallback(() => {
    if (!itemContextMenu) return;
    const item = itemContextMenu.item;
    setItemContextMenu(null);
    if (item.url) {
      window.open(item.url, "_blank");
    } else if (item.type === "folder") {
      onSelectFolder?.(item.name);
    } else if (sectionId && onOpenItem && item.id && !dragDisabled) {
      onOpenItem(sectionId, item.id, item.name);
    } else {
      onOpenFile?.(item.name, item.detail);
    }
  }, [itemContextMenu, sectionId, dragDisabled, onSelectFolder, onOpenItem, onOpenFile]);

  const handleItemDelete = useCallback(() => {
    if (!itemContextMenu) return;
    const item = itemContextMenu.item;
    setItemContextMenu(null);
    onDeleteItem?.(item.name);
  }, [itemContextMenu, onDeleteItem]);

  // --- Drag & Drop ---

  const handleDragStart = useCallback((e: React.DragEvent, itemName: string) => {
    if (!sectionId) return;
    _dragData = { sectionId, itemName, parentItemId: parentItemId ?? null };
    e.dataTransfer.setData("text/plain", _dragData.itemName);
    e.dataTransfer.effectAllowed = "move";
  }, [sectionId, parentItemId]);

  const handleDragEnd = useCallback(() => {
    _dragData = null;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.getAttribute("data-item-type") === "folder") {
      e.preventDefault();
      setDragOverName(el.getAttribute("data-item-name"));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.getAttribute("data-item-type") === "folder") {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.getAttribute("data-item-type") === "folder") {
      setDragOverName((prev) => prev === el.getAttribute("data-item-name") ? null : prev);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    const targetName = el.getAttribute("data-item-name");
    if (!targetName) return;
    e.preventDefault();
    setDragOverName(null);
    const data = _dragData ?? JSON.parse(e.dataTransfer.getData("text/plain") || "null");
    if (!data || !data.itemName) return;
    onDropOnFolder?.(targetName, data.itemName);
    _dragData = null;
  }, [onDropOnFolder]);

  const handleContentClick = useCallback(() => {
    setItemContextMenu(null);
  }, []);

  // Close context menus on click outside
  useEffect(() => {
    if (!contextMenu && !itemContextMenu) return;
    const handler = () => {
      setContextMenu(null);
      setItemContextMenu(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, itemContextMenu]);

  return (
    <div className="window-content-inner" onContextMenu={handleContextMenu} onClick={handleContentClick}>
      {contextMenu && !dragDisabled && (() => {
        const menuW = 140;
        const menuH = 86;
        const cx = Math.max(4, Math.min(contextMenu.x, window.innerWidth - menuW - 4));
        const cy = Math.max(4, Math.min(contextMenu.y, window.innerHeight - menuH - 4));
        return (
        <div
          className="folder-context-menu"
          style={{ left: cx, top: cy }}
          onClick={closeContextMenu}
        >
          <div
            className="folder-context-item"
            onClick={handleNewFile}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--menu-hover-bg, #e0e0e0)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            New File
          </div>
          <div
            className="folder-context-item"
            onClick={handleNewFolder}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--menu-hover-bg, #e0e0e0)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            New Folder
          </div>
        </div>
        );
      })()}

      {itemContextMenu && !dragDisabled && (() => {
        const menuW = 120;
        const menuH = 78;
        const icx = Math.max(4, Math.min(itemContextMenu.x, window.innerWidth - menuW - 4));
        const icy = Math.max(4, Math.min(itemContextMenu.y, window.innerHeight - menuH - 4));
        return (
        <div
          className="folder-context-menu"
          style={{ left: icx, top: icy }}
          onClick={closeItemContextMenu}
        >
          <div
            className="folder-context-item"
            onClick={handleItemOpen}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--menu-hover-bg, #e0e0e0)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            Open
          </div>
          <div
            className="folder-context-item"
            onClick={handleItemDelete}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--menu-hover-bg, #e0e0e0)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            Delete
          </div>
        </div>
        );
      })()}

      <div className="filebrowser-list" role="list">
        {creating && (
          <div
            className="filebrowser-item creating"
            role="listitem"
          >
            {creating === "folder" ? <FolderIcon /> : <FileIcon />}
            <input
              ref={inputRef}
              type="text"
              className="filebrowser-create-inline"
              placeholder={creating === "file" ? "New file..." : "New folder..."}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreateBlur}
              onKeyDown={handleCreateKeyDown}
            />
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={"filebrowser-item" + (dragOverName === item.name && item.type === "folder" ? " drag-over" : "")}
            role="listitem"
            tabIndex={0}
            draggable={!!sectionId && !dragDisabled}
            data-item-name={item.name}
            data-item-type={item.type}
            onDragStart={(e) => handleDragStart(e, item.name)}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(e) => handleItemContextMenu(e, item)}
            onDoubleClick={() => {
              if (item.url) {
                window.open(item.url, "_blank");
              } else if (item.type === "folder") {
                onSelectFolder?.(item.name);
              } else if (sectionId && onOpenItem && item.id && !dragDisabled) {
                onOpenItem(sectionId, item.id, item.name);
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
                } else if (sectionId && onOpenItem && item.id && !dragDisabled) {
                  onOpenItem(sectionId, item.id, item.name);
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
                <div className="filebrowser-item-desc">
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
