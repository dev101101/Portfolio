import { useEffect, useRef } from "react";
import { useT } from "../context/LanguageContext";

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
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);

  const menuWidth = 160;
  const menuHeight = actions.length * 32 + 8;
  const clampedX = Math.max(4, Math.min(x, window.innerWidth - menuWidth - 4));
  const clampedY = Math.max(4, Math.min(y, window.innerHeight - menuHeight - 4));

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
      aria-label={t("contextMenu.ariaLabel")}
      className="context-menu"
      style={{ position: "fixed", left: clampedX, top: clampedY, zIndex: 9999 }}
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
          className={"context-menu-item" + (a.disabled ? " disabled" : "")}
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