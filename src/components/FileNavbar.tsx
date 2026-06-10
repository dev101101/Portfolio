import { useState, useRef, useEffect } from "react";

interface FileNavbarProps {
  onSave: () => void;
  onPreview: () => void;
  previewing: boolean;
  onSelectAll: () => void;
  onSaveForever?: () => void;
  onOpenHelp?: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

function MenuDropdown({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="menu-dropdown"
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <div
          key={item.label}
          role="menuitem"
          tabIndex={item.disabled ? -1 : 0}
          aria-disabled={item.disabled}
          className={`menu-dropdown-item${item.disabled ? " disabled" : ""}`}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }
          }}
        >
          <span className="menu-dropdown-label">{item.label}</span>
          {item.shortcut && <span className="menu-dropdown-shortcut">{item.shortcut}</span>}
        </div>
      ))}
    </div>
  );
}

function FileNavbar({ onSave, onPreview, previewing, onSelectAll, onSaveForever, onOpenHelp }: FileNavbarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fileItems: MenuItem[] = [
    { label: "Save", shortcut: "Ctrl+S", onClick: onSave },
    { label: previewing ? "Edit" : "Preview", onClick: onPreview },
  ];
  if (onSaveForever) {
    fileItems.push({ label: "Save Forever", onClick: onSaveForever });
  }

  const menus: { label: string; items: MenuItem[] }[] = [
    { label: "File", items: fileItems },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A", onClick: onSelectAll },
      ],
    },
  ];

  if (onOpenHelp) {
    menus.push({
      label: "Help",
      items: [
        { label: "About Text Editor", onClick: onOpenHelp },
      ],
    });
  }

  return (
    <div className="menubar" role="menubar">
      {menus.map((menu) => (
        <div key={menu.label} className="menubar-menu">
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openMenu === menu.label}
            className={`menubar-button${openMenu === menu.label ? " active" : ""}`}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => { if (openMenu) setOpenMenu(menu.label); }}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <MenuDropdown items={menu.items} onClose={() => setOpenMenu(null)} />
          )}
        </div>
      ))}
    </div>
  );
}

export default FileNavbar;
