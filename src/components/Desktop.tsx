import { useState, useCallback } from "react";
import type { Folder } from "../types/desktop";
import FolderIcon from "./FolderIcon";

const GRID_SIZE_X = 100;
const GRID_SIZE_Y = 110;

function snapToGrid(x: number, y: number) {
  return {
    col: Math.max(0, Math.round(x / GRID_SIZE_X)),
    row: Math.max(0, Math.round(y / GRID_SIZE_Y)),
  };
}

function gridToPixel(col: number, row: number) {
  return { x: col * GRID_SIZE_X, y: row * GRID_SIZE_Y };
}

function findFreePixel(
  x: number,
  y: number,
  excludeId: string,
  positions: Record<string, { x: number; y: number }>,
) {
  const target = snapToGrid(x, y);

  const isOccupied = (col: number, row: number) =>
    Object.entries(positions)
      .filter(([id]) => id !== excludeId)
      .some(([, pos]) => {
        const g = snapToGrid(pos.x, pos.y);
        return g.col === col && g.row === row;
      });

  if (!isOccupied(target.col, target.row)) {
    return gridToPixel(target.col, target.row);
  }

  for (let row = 0; row < 50; row++) {
    for (let col = 0; col < 10; col++) {
      if (!isOccupied(col, row)) {
        return gridToPixel(col, row);
      }
    }
  }
  return gridToPixel(target.col, target.row);
}

interface DesktopProps {
  folders: Folder[];
  theme: string;
  onOpenFolder: (id: string) => void;
}

function Desktop({ folders, theme, onOpenFolder }: DesktopProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    folders.forEach((f, i) => {
      pos[f.id] = gridToPixel(0, i);
    });
    return pos;
  });

  const moveIcon = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const dropIcon = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const snapped = findFreePixel(x, y, id, prev);
      return { ...prev, [id]: snapped };
    });
  }, []);

  return (
    <div className="desktop">
      {folders.map((f) => {
        const p = positions[f.id];
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
          />
        );
      })}
    </div>
  );
}

export default Desktop;
