import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Folder } from "../types/desktop";
import FolderIcon from "./FolderIcon";
import ContextMenu from "./ContextMenu";
import { PROTECTED_IDS } from "../data/constants";
import { useT } from "../context/LanguageContext";

const GRID_SIZE_X = 100;
const GRID_SIZE_Y = 110;
const STORAGE_KEY = "portfolio-desktop-positions";

const WALLPAPERS: Record<string, string> = {
  pixel: "/wallhaven-rdrlkm.webp",
  classic: "/wp2660135-windows-95-wallpaper-hd.webp",
  modern: "/wallhaven-vmy7j8.webp",
};

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
  onDropFileIntoFolder?: (fileSectionId: string, folderSectionId: string) => void;
  onDropItemFromFolder?: (sectionId: string, itemName: string, x: number, y: number) => void;
}

type ContextMenuState =
  | { type: "icon"; x: number; y: number; folderId: string; isProtected: boolean }
  | { type: "desktop"; x: number; y: number }
  | null;

function Desktop({ folders, theme, onOpenFolder, onRenameSection, onDeleteSection, onNewFolder, onNewFile, onRefresh, onDropFileIntoFolder, onDropItemFromFolder }: DesktopProps) {
  const { t } = useT();
  const [wallpaperLoaded, setWallpaperLoaded] = useState(() => !WALLPAPERS[theme]);
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

  const [gridMetrics, setGridMetrics] = useState(() => ({
    cols: Math.max(1, Math.floor(window.innerWidth / GRID_SIZE_X)),
    rows: Math.max(1, Math.floor(window.innerHeight / GRID_SIZE_Y)),
  }));

  useEffect(() => {
    const onResize = () => setGridMetrics({
      cols: Math.max(1, Math.floor(window.innerWidth / GRID_SIZE_X)),
      rows: Math.max(1, Math.floor(window.innerHeight / GRID_SIZE_Y)),
    });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const allPositions = useMemo(() => {
    const folderIds = new Set(folders.map((f) => f.id));
    const cols = gridMetrics.cols;
    const rows = gridMetrics.rows;
    const next: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(positions)) {
      if (folderIds.has(id)) {
        const g = snapToGrid(pos.x, pos.y);
        if (g.col >= 0 && g.col < cols && g.row >= 0 && g.row < rows) {
          next[id] = pos;
        }
      }
    }
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
  }, [folders, positions, gridMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered: Record<string, { x: number; y: number }> = {};
      const folderIds = new Set(folders.map((f) => f.id));
      for (const [id, pos] of Object.entries(positions)) {
        if (folderIds.has(id)) {
          filtered[id] = pos;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }, 300);
    return () => clearTimeout(timer);
  }, [positions, folders]);

  const moveIcon = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const dropIcon = useCallback((id: string, x: number, y: number) => {
    const target = snapToGrid(x, y);
    const { cols, rows } = gridMetrics;
    if (target.col < 0 || target.col >= cols || target.row < 0 || target.row >= rows) {
      return;
    }

    setPositions((prev) => {
      const pixel = gridToPixel(target.col, target.row);

      const occupant = Object.entries(prev).find(([oid, pos]) => {
        if (oid === id) return false;
        const g = snapToGrid(pos.x, pos.y);
        return g.col === target.col && g.row === target.row;
      });

      if (!occupant) {
        return { ...prev, [id]: pixel };
      }

      const [occId] = occupant;

      const dragged = folders.find((f) => f.id === id);
      const occFolder = folders.find((f) => f.id === occId);
      if (dragged && occFolder && dragged.type === "file" && dragged.id !== "about" && occFolder.type === "folder") {
        setTimeout(() => onDropFileIntoFolder?.(id, occId), 0);
        return prev;
      }

      const origin = dragOriginRef.current;
      const swapPixel = gridToPixel(origin.col, origin.row);
      return { ...prev, [id]: pixel, [occId]: swapPixel };
    });
  }, [folders, onDropFileIntoFolder, gridMetrics]);

  const dragOriginRef = useRef({ col: 0, row: 0 });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const pendingRenameRef = useRef<string | null>(null);
  const renamingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingRenameRef.current) {
      setRenamingId(pendingRenameRef.current);
      pendingRenameRef.current = null;
    }
  }, [folders]);

  useEffect(() => {
    if (renamingId && renamingInputRef.current) {
      renamingInputRef.current.focus();
      renamingInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameSubmit = useCallback((id: string, label: string) => {
    if (label.trim()) {
      onRenameSection(id, label.trim());
    }
    setRenamingId(null);
  }, [onRenameSection]);

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

  const handleNewFolder = useCallback(() => {
    const id = `folder-${Date.now()}`;
    pendingRenameRef.current = id;

    if (contextMenu && contextMenu.type === "desktop") {
      const target = snapToGrid(contextMenu.x, contextMenu.y);
      const { cols, rows } = gridMetrics;
      const taken = Object.values(positions);
      const targetPixel = gridToPixel(target.col, target.row);
      const inBounds = target.col >= 0 && target.col < cols && target.row >= 0 && target.row < rows;
      const isFree = inBounds && !taken.some((t) => t.x === targetPixel.x && t.y === targetPixel.y);

      let pos: { x: number; y: number };
      if (isFree) {
        pos = targetPixel;
      } else {
        let placed = false;
        pos = targetPixel;
        for (let r = 0; r < rows && !placed; r++) {
          for (let c = 0; c < cols && !placed; c++) {
            const candidate = gridToPixel(c, r);
            if (!taken.some((t) => t.x === candidate.x && t.y === candidate.y)) {
              pos = candidate;
              placed = true;
            }
          }
        }
        if (!placed) pos = { x: 0, y: -9999 };
      }

      setPositions((prev) => ({ ...prev, [id]: pos }));
    }

    onNewFolder(id, t("desktop.newFolder"));
    closeContextMenu();
  }, [onNewFolder, closeContextMenu, contextMenu, positions, gridMetrics]);

  const handleNewFile = useCallback(() => {
    const id = `file-${Date.now()}`;
    pendingRenameRef.current = id;

    if (contextMenu && contextMenu.type === "desktop") {
      const target = snapToGrid(contextMenu.x, contextMenu.y);
      const { cols, rows } = gridMetrics;
      const taken = Object.values(positions);
      const targetPixel = gridToPixel(target.col, target.row);
      const inBounds = target.col >= 0 && target.col < cols && target.row >= 0 && target.row < rows;
      const isFree = inBounds && !taken.some((t) => t.x === targetPixel.x && t.y === targetPixel.y);

      let pos: { x: number; y: number };
      if (isFree) {
        pos = targetPixel;
      } else {
        let placed = false;
        pos = targetPixel;
        for (let r = 0; r < rows && !placed; r++) {
          for (let c = 0; c < cols && !placed; c++) {
            const candidate = gridToPixel(c, r);
            if (!taken.some((t) => t.x === candidate.x && t.y === candidate.y)) {
              pos = candidate;
              placed = true;
            }
          }
        }
        if (!placed) pos = { x: 0, y: -9999 };
      }

      setPositions((prev) => ({ ...prev, [id]: pos }));
    }

    onNewFile(id, t("desktop.newFile"));
    closeContextMenu();
  }, [onNewFile, closeContextMenu, contextMenu, positions, gridMetrics]);

  const handleDropFromFolder = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const { sectionId, itemName } = JSON.parse(raw);
      if (!sectionId || !itemName) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onDropItemFromFolder?.(sectionId, itemName, x, y);
    } catch { /* ignore */ }
  }, [onDropItemFromFolder]);

  const folderIcons = useMemo(() =>
    folders.map((f) => {
      const p = allPositions[f.id] ?? { x: 0, y: 0 };
      const isRenaming = renamingId === f.id;
      return (
        <FolderIcon
          key={f.id}
          label={f.label}
          type={f.type}
          theme={theme}
          position={p}
          onMove={(x, y) => moveIcon(f.id, x, y)}
          onDrop={(x, y) => dropIcon(f.id, x, y)}
          onDragStart={() => { dragOriginRef.current = snapToGrid(p.x, p.y); }}
          onDoubleClick={() => onOpenFolder(f.id)}
          onContextMenu={(e) => handleIconContextMenu(e, f.id)}
          isRenaming={isRenaming}
          onRenameSubmit={(label) => handleRenameSubmit(f.id, label)}
          onRenameCancel={() => setRenamingId(null)}
          inputRef={isRenaming ? renamingInputRef : undefined}
        />
      );
    }),
    [folders, allPositions, renamingId, theme, moveIcon, dropIcon, onOpenFolder, handleIconContextMenu, handleRenameSubmit],
  );

  return (
    <div className="desktop" role="region" aria-label={t("desktop.ariaLabel")} onContextMenu={handleDesktopContextMenu} onDragOver={(e) => e.preventDefault()} onDrop={handleDropFromFolder}>
      <div key={`wp-${theme}`} className={`desktop-wallpaper ${wallpaperLoaded ? "loaded" : ""}`} aria-hidden="true" />
      {WALLPAPERS[theme] && (
        <img key={`preload-${theme}`} src={WALLPAPERS[theme]!} onLoad={() => setWallpaperLoaded(true)} className="wallpaper-preload" alt="" />
      )}
      {folderIcons}
      {contextMenu && contextMenu.type === "icon" && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={[
            { label: t("desktop.open"), onClick: () => onOpenFolder(contextMenu.folderId) },
            { label: t("desktop.rename"), onClick: () => { setRenamingId(contextMenu.folderId); }, disabled: contextMenu.isProtected },
            { label: t("desktop.delete"), onClick: () => onDeleteSection(contextMenu.folderId), disabled: contextMenu.isProtected },
          ]}
          onClose={closeContextMenu}
        />
      )}
      {contextMenu && contextMenu.type === "desktop" && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={[
            { label: t("desktop.newFolder"), onClick: handleNewFolder },
            { label: t("desktop.newFile"), onClick: handleNewFile },
            { label: t("desktop.refresh"), onClick: () => onRefresh() },
          ]}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export default Desktop;
