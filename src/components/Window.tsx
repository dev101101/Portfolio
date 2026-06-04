import { useRef, useCallback, useState, type ReactNode } from "react";
import type { WindowState } from "../types/desktop";

interface WindowProps {
  win: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
}

function Window({
  win,
  onClose,
  onMinimize,
  onFocus,
  onMove,
  onResize,
  children,
}: WindowProps) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ resizing: false, startX: 0, startY: 0, startW: 0, startH: 0 });
  const [resizing, setResizing] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const savedRef = useRef({ x: 0, y: 0, w: 560, h: 400 });

  const toggleMaximize = useCallback(() => {
    if (maximized) {
      onMove(savedRef.current.x, savedRef.current.y);
      onResize(savedRef.current.w, savedRef.current.h);
      setMaximized(false);
    } else {
      savedRef.current = { x: win.position.x, y: win.position.y, w: win.size.width, h: win.size.height };
      onMove(0, 0);
      onResize(window.innerWidth, window.innerHeight - 40);
      setMaximized(true);
    }
  }, [maximized, win.position, win.size, onMove, onResize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onFocus();
      const el = dragRef.current;
      el.dragging = true;
      el.startX = e.clientX;
      el.startY = e.clientY;
      el.startPosX = win.position.x;
      el.startPosY = win.position.y;

      const onDrag = (ev: MouseEvent) => {
        if (!el.dragging) return;
        onMove(el.startPosX + ev.clientX - el.startX, el.startPosY + ev.clientY - el.startY);
      };
      const onUp = () => {
        el.dragging = false;
        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", onUp);
    },
    [onFocus, onMove, win.position],
  );

  const handleResizeDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setResizing(true);
      const el = resizeRef.current;
      el.resizing = true;
      el.startX = e.clientX;
      el.startY = e.clientY;
      el.startW = win.size.width;
      el.startH = win.size.height;

      const onMove = (ev: MouseEvent) => {
        if (!el.resizing) return;
        const dw = ev.clientX - el.startX;
        const dh = ev.clientY - el.startY;
        onResize(Math.max(300, el.startW + dw), Math.max(200, el.startH + dh));
      };
      const onUp = () => {
        el.resizing = false;
        setResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onResize, win.size],
  );

  if (win.isMinimized) return null;

  return (
    <div
      className={`window${resizing ? " resizing" : ""}`}
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={onFocus}
    >
      <div className="window-titlebar" onMouseDown={handleMouseDown} onDoubleClick={toggleMaximize}>
        <span className="window-title">{win.title}</span>
        <div className="window-controls">
          <button className="win-btn minimize" onClick={onMinimize} title="Minimize" />
          <button className="win-btn maximize" onClick={toggleMaximize} title={maximized ? "Restore" : "Maximize"} />
          <button className="win-btn close" onClick={onClose} title="Close" />
        </div>
      </div>
      <div className="window-content">{children}</div>
      <div className="window-resize-handle" onMouseDown={handleResizeDown} />
    </div>
  );
}

export default Window;
