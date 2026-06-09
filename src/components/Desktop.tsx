import { useState, useCallback, useEffect, useMemo } from "react";
import type { Folder } from "../types/desktop";
import FolderIcon from "./FolderIcon";
import ContextMenu from "./ContextMenu";
import { PROTECTED_IDS } from "../data/constants";

const GRID_SIZE_X = 100;
const GRID_SIZE_Y = 110;
const STORAGE_KEY = "portfolio-desktop-positions";

function getGridCols() {
  return Math.max(1, Math.floor(window.innerWidth / GRID_SIZE_X));
}

function getGridRows() {
  return Math.max(1, Math.floor(window.innerHeight / GRID_SIZE_Y));
}

function snapToGrid(x: number, y: number) {
  return {
    col: Math.max(0, Math.round(x / GRID_SIZE_X)),
    row: Math.max(0, Math.round(y / GRID_SIZE_Y)),
  };
}

function gridToPixel(col: number, row: number) {
  return { x: col * GRID_SIZE_X, y: row * GRID_SIZE_Y };
}

interface DesktopProps {
  folders: Folder[];
  theme: string;
  onOpenFolder: (id: string) => void;
  onRenameSection: (id: string, label: string) => void;
  onDeleteSection: (id: string) => void;
  onNewFolder: (id: string, label: string) => void;
  onNewFile: (id: string, label: string) => void;
  onRefresh: () => void;
}

type ContextMenuState =
  | { type: "icon"; x: number; y: number; folderId: string; isProtected: boolean }
  | { type: "desktop"; x: number; y: number }
  | null;

function Desktop({ folders, theme, onOpenFolder, onRenameSection, onDeleteSection, onNewFolder, onNewFile, onRefresh }: DesktopProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    const pos: Record<string, { x: number; y: number }> = {};
    folders.forEach((f, i) => {
      pos[f.id] = gridToPixel(0, i);
    });
    return pos;
  });

  const allPositions = useMemo(() => {
    const next = { ...positions };
    const cols = getGridCols();
    const rows = getGridRows();
    for (const f of folders) {
      if (!(f.id in next)) {
        const taken = Object.values(next);
        let placed = false;
        for (let r = 0; r < rows && !placed; r++) {
          for (let c = 0; c < cols && !placed; c++) {
            const candidate = gridToPixel(c, r);
            if (!taken.some((t) => t.x === candidate.x && t.y === candidate.y)) {
              next[f.id] = candidate;
              placed = true;
            }
          }
        }
        if (!placed) {
          next[f.id] = { x: 0, y: -9999 };
        }
      }
    }
    return next;
  }, [folders, positions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  }, [positions]);

  const moveIcon = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const dropIcon = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const target = snapToGrid(x, y);
      const cols = getGridCols();
      const rows = getGridRows();
      if (target.col < 0 || target.col >= cols || target.row < 0 || target.row >= rows) {
        return prev;
      }
      const pixel = gridToPixel(target.col, target.row);

      const occupant = Object.entries(prev).find(([oid, pos]) => {
        if (oid === id) return false;
        const g = snapToGrid(pos.x, pos.y);
        return g.col === target.col && g.row === target.row;
      });

      if (!occupant) {
        return { ...prev, [id]: pixel };
      }

      const next = { ...prev, [id]: pixel };
      const [occId] = occupant;
      const occTaken = Object.values(next);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const free = gridToPixel(c, r);
          if (!occTaken.some((t) => t.x === free.x && t.y === free.y)) {
            next[occId] = free;
            return next;
          }
        }
      }
      return next;
    });
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const handleIconContextMenu = useCallback((e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isProtected = PROTECTED_IDS.includes(folderId);
    setContextMenu({ type: "icon", x: e.clientX, y: e.clientY, folderId, isProtected });
  }, []);

  const handleDesktopContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ type: "desktop", x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return (
    <div className="desktop" onContextMenu={handleDesktopContextMenu}>
      {folders.map((f) => {
        const p = allPositions[f.id];
        return (
          <FolderIcon
            key={f.id}
            label={f.label}
            type={f.type}
            theme={theme}
            position={p}
            onMove={(x, y) => moveIcon(f.id, x, y)}
            onDrop={(x, y) => dropIcon(f.id, x, y)}
            onDoubleClick={() => onOpenFolder(f.id)}
            onContextMenu={(e) => handleIconContextMenu(e, f.id)}
          />
        );
      })}
      {contextMenu && contextMenu.type === "icon" && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={[
            { label: "Open", onClick: () => onOpenFolder(contextMenu.folderId) },
            { label: "Rename", onClick: () => { const label = prompt("Enter new name:"); if (label) onRenameSection(contextMenu.folderId, label); }, disabled: contextMenu.isProtected },
            { label: "Delete", onClick: () => onDeleteSection(contextMenu.folderId), disabled: contextMenu.isProtected },
          ]}
          onClose={closeContextMenu}
        />
      )}
      {contextMenu && contextMenu.type === "desktop" && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={[
            { label: "New Folder", onClick: () => {
              const id = prompt("Folder ID:");
              const label = prompt("Folder name:");
              if (id && label) onNewFolder(id, label);
            }},
            { label: "New File", onClick: () => {
              const id = prompt("File ID:");
              const label = prompt("File name:");
              if (id && label) onNewFile(id, label);
            }},
            { label: "Refresh", onClick: () => onRefresh() },
          ]}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export default Desktop;
