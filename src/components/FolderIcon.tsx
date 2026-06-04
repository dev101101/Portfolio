import { useRef, useCallback } from "react";
import { PixelFolder, ClassicFolder, ModernFolder, TerminalFolder } from "./FolderSvgs";

interface FolderIconProps {
  label: string;
  onDoubleClick: () => void;
  theme: string;
  position: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onDrop: (x: number, y: number) => void;
}

function FolderIcon({ label, onDoubleClick, theme, position, onMove, onDrop }: FolderIconProps) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const el = dragRef.current;
      el.dragging = true;
      el.startX = e.clientX;
      el.startY = e.clientY;
      el.startPosX = position.x;
      el.startPosY = position.y;

      const onDrag = (ev: MouseEvent) => {
        if (!el.dragging) return;
        onMove(
          el.startPosX + ev.clientX - el.startX,
          el.startPosY + ev.clientY - el.startY,
        );
      };
      const onUp = (ev: MouseEvent) => {
        el.dragging = false;
        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", onUp);
        onDrop(el.startPosX + ev.clientX - el.startX, el.startPosY + ev.clientY - el.startY);
      };
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", onUp);
    },
    [position, onMove, onDrop],
  );

  const svg =
    theme === "pixel" ? <PixelFolder /> :
    theme === "classic" ? <ClassicFolder /> :
    theme === "terminal" ? <TerminalFolder /> :
    <ModernFolder />;

  return (
    <div
      className="desktop-icon"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {svg}
      <span className="desktop-icon-label">{label}</span>
    </div>
  );
}

export default FolderIcon;
