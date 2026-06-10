import { useRef, useCallback } from "react";
import {
  PixelFolder,
  ClassicFolder,
  ModernFolder,
  TerminalFolder,
  PixelFile,
  ClassicFile,
  ModernFile,
  TerminalFile,
  PixelTerminal,
  ClassicTerminal,
  ModernTerminal,
  TerminalTerminal,
} from "./FolderSvgs";

interface FolderIconProps {
  label: string;
  type: "file" | "folder" | "terminal";
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  theme: string;
  position: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onDrop: (x: number, y: number) => void;
  onDragStart?: () => void;
  isRenaming?: boolean;
  onRenameSubmit?: (label: string) => void;
  onRenameCancel?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function FolderIcon({
  label,
  type,
  onDoubleClick,
  onContextMenu,
  theme,
  position,
  onMove,
  onDrop,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
  inputRef,
  onDragStart,
}: FolderIconProps) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    moved: false,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isRenaming) return;
      e.preventDefault();
      onDragStart?.();
      const el = dragRef.current;
      el.dragging = true;
      el.moved = false;
      el.startX = e.clientX;
      el.startY = e.clientY;
      el.startPosX = position.x;
      el.startPosY = position.y;

      const onDrag = (ev: MouseEvent) => {
        if (!el.dragging) return;
        const dx = ev.clientX - el.startX;
        const dy = ev.clientY - el.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) el.moved = true;
        onMove(el.startPosX + dx, el.startPosY + dy);
      };
      const onUp = (ev: MouseEvent) => {
        el.dragging = false;
        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", onUp);
        onDrop(
          el.startPosX + ev.clientX - el.startX,
          el.startPosY + ev.clientY - el.startY,
        );
      };
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", onUp);
    },
    [position, onMove, onDrop, isRenaming, onDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRenaming) return;
      onDragStart?.();
      const touch = e.touches[0]!;
      const el = dragRef.current;
      el.dragging = true;
      el.moved = false;
      el.startX = touch.clientX;
      el.startY = touch.clientY;
      el.startPosX = position.x;
      el.startPosY = position.y;

      const onDrag = (ev: TouchEvent) => {
        if (!el.dragging) return;
        ev.preventDefault();
        const t = ev.touches[0]!;
        const dx = t.clientX - el.startX;
        const dy = t.clientY - el.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) el.moved = true;
        onMove(el.startPosX + dx, el.startPosY + dy);
      };
      const onUp = (ev: TouchEvent) => {
        el.dragging = false;
        document.removeEventListener("touchmove", onDrag);
        document.removeEventListener("touchend", onUp);
        const t = ev.changedTouches[0]!;
        if (!el.moved) {
          onDoubleClick();
        } else {
          onDrop(
            el.startPosX + t.clientX - el.startX,
            el.startPosY + t.clientY - el.startY,
          );
        }
      };
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", onUp);
    },
    [position, onMove, onDrop, isRenaming, onDoubleClick, onDragStart],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isRenaming) {
        if (e.key === "Enter") {
          e.preventDefault();
          onRenameSubmit?.((e.target as HTMLInputElement).value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onRenameCancel?.();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onDoubleClick();
      }
    },
    [onRenameSubmit, onRenameCancel, isRenaming, onDoubleClick],
  );

  const handleBlur = useCallback(() => {
    onRenameSubmit?.("");
  }, [onRenameSubmit]);

  const svg =
    type === "file" ? (
      theme === "pixel" ? (
        <PixelFile />
      ) : theme === "classic" ? (
        <ClassicFile />
      ) : theme === "terminal" ? (
        <TerminalFile />
      ) : (
        <ModernFile />
      )
    ) : type === "folder" ? (
      theme === "pixel" ? (
        <PixelFolder />
      ) : theme === "classic" ? (
        <ClassicFolder />
      ) : theme === "terminal" ? (
        <TerminalFolder />
      ) : (
        <ModernFolder />
      )
    ) : theme === "pixel" ? (
      <PixelTerminal />
    ) : theme === "classic" ? (
      <ClassicTerminal />
    ) : theme === "terminal" ? (
      <TerminalTerminal />
    ) : (
      <ModernTerminal />
    );

  return (
    <div
      className="desktop-icon"
      role="button"
      tabIndex={0}
      aria-label={label}
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={handleKeyDown}
    >
      {svg}
      {isRenaming ? (
        <input
          ref={inputRef}
          className="desktop-icon-input"
          type="text"
          defaultValue={label}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Rename ${label}`}
        />
      ) : (
        <span className="desktop-icon-label">{label}</span>
      )}
    </div>
  );
}

export default FolderIcon;
