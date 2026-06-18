import { useRef, useCallback, useState, useEffect, type ReactNode } from "react";
import type { WindowState } from "../types/desktop";
import { useT } from "../context/language";

interface WindowProps {
  win: WindowState;
  isActive?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
  navbar?: ReactNode;
}

function Window({
  win,
  isActive,
  onClose,
  onMinimize,
  onFocus,
  onMove,
  onResize,
  children,
  navbar,
}: WindowProps) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });
  const resizeRef = useRef({
    resizing: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });
  const { t } = useT();
  const [resizing, setResizing] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const savedRef = useRef({ x: 0, y: 0, w: 642, h: 430 });

  const clampPosition = useCallback(() => {
    const margin = 4;
    const taskbarH = 40;
    const maxX = window.innerWidth - win.size.width - margin;
    const maxY = window.innerHeight - win.size.height - taskbarH - margin;
    if (maxX < margin && maxY < taskbarH + margin) return;
    let newX = win.position.x;
    let newY = win.position.y;
    if (win.position.x + win.size.width > window.innerWidth - margin) {
      newX = Math.max(margin, maxX);
    }
    if (win.position.x < margin) {
      newX = margin;
    }
    if (win.position.y + win.size.height > window.innerHeight - taskbarH - margin) {
      newY = Math.max(taskbarH + margin, maxY);
    }
    if (win.position.y < taskbarH + margin) {
      newY = taskbarH + margin;
    }
    console.log("clampPosition →", { before: win.position, afterX: newX, afterY: newY, viewportW: window.innerWidth, viewportH: window.innerHeight });
    if (newX !== win.position.x || newY !== win.position.y) {
      onMove(newX, newY);
    }
  }, [win.position, win.size, onMove]);

  useEffect(() => {
    const handleResize = () => clampPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  const toggleMaximize = useCallback(() => {
    if (maximized) {
      onMove(savedRef.current.x, savedRef.current.y);
      onResize(savedRef.current.w, savedRef.current.h);
      setMaximized(false);
    } else {
      savedRef.current = {
        x: win.position.x,
        y: win.position.y,
        w: win.size.width,
        h: win.size.height,
      };
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
        const newX = el.startPosX + ev.clientX - el.startX;
        const newY = el.startPosY + ev.clientY - el.startY;
        console.log("drag →", { startPosX: el.startPosX, startPosY: el.startPosY, deltaX: ev.clientX - el.startX, deltaY: ev.clientY - el.startY, newX, newY });
        onMove(newX, newY);
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      onFocus();
      const touch = e.touches[0]!;
      const el = dragRef.current;
      el.dragging = true;
      el.startX = touch.clientX;
      el.startY = touch.clientY;
      el.startPosX = win.position.x;
      el.startPosY = win.position.y;

      const onDrag = (ev: TouchEvent) => {
        if (!el.dragging) return;
        const t = ev.touches[0]!;
        onMove(
          el.startPosX + t.clientX - el.startX,
          el.startPosY + t.clientY - el.startY,
        );
      };
      const onUp = () => {
        el.dragging = false;
        document.removeEventListener("touchmove", onDrag);
        document.removeEventListener("touchend", onUp);
      };
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", onUp);
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

  const handleResizeTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setResizing(true);
      const touch = e.touches[0]!;
      const el = resizeRef.current;
      el.resizing = true;
      el.startX = touch.clientX;
      el.startY = touch.clientY;
      el.startW = win.size.width;
      el.startH = win.size.height;

      const onMove = (ev: TouchEvent) => {
        if (!el.resizing) return;
        const t = ev.touches[0]!;
        const dw = t.clientX - el.startX;
        const dh = t.clientY - el.startY;
        onResize(Math.max(300, el.startW + dw), Math.max(200, el.startH + dh));
      };
      const onUp = () => {
        el.resizing = false;
        setResizing(false);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onUp);
      };
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
    },
    [onResize, win.size],
  );

  if (win.isMinimized) return null;

  return (
    <div
      className={`window${resizing ? " resizing" : ""}${isActive ? " active" : ""}`}
      role="dialog"
      aria-label={win.title}
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={onFocus}
    >
      <div
        className="window-titlebar"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={toggleMaximize}
      >
        <span className="window-title">{win.title}</span>
        <div className="window-controls">
          <button
            className="win-btn minimize"
            onClick={onMinimize}
            title={t("window.minimize")}
            aria-label={t("window.minimize")}
          />
          <button
            className="win-btn maximize"
            onClick={toggleMaximize}
            title={maximized ? t("window.restore") : t("window.maximize")}
            aria-label={maximized ? t("window.restore") : t("window.maximize")}
          />
          <button
            className="win-btn close"
            onClick={onClose}
            title={t("window.close")}
            aria-label={t("window.close")}
          />
        </div>
      </div>
      {navbar && <div className="window-navbar">{navbar}</div>}
      <div className="window-content">{children}</div>
      <div
        className="window-resize-handle"
        onMouseDown={handleResizeDown}
        onTouchStart={handleResizeTouchStart}
      />
    </div>
  );
}

export default Window;
