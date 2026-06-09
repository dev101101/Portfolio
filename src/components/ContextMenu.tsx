import { useEffect, useRef } from "react";

interface ContextMenuAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("[role='menuitem']:not([aria-disabled='true'])");
    first?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Context menu"
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        background: "#2d2d2d",
        border: "1px solid #555",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 160,
        boxShadow: "2px 2px 8px rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((a) => (
        <div
          key={a.label}
          role="menuitem"
          tabIndex={a.disabled ? -1 : 0}
          aria-disabled={a.disabled}
          onClick={() => {
            if (!a.disabled) a.onClick();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!a.disabled) a.onClick();
              onClose();
            }
          }}
          style={{
            padding: "6px 16px",
            cursor: a.disabled ? "default" : "pointer",
            color: a.disabled ? "#666" : "#eee",
            fontSize: 13,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
          }}
          onMouseEnter={(e) => { if (!a.disabled) e.currentTarget.style.background = "#094771"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {a.label}
        </div>
      ))}
    </div>
  );
}

export default ContextMenu;