import { useState, useRef, useEffect } from "react";

interface FileNavbarProps {
  onSave: () => void;
  onSelectAll: () => void;
  onSaveForever: () => void;
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
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`menu-dropdown-item${item.disabled ? " disabled" : ""}`}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
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

function FileNavbar({ onSave, onSelectAll, onSaveForever }: FileNavbarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: "File",
      items: [
        { label: "Save", shortcut: "Ctrl+S", onClick: onSave },
        { label: "Save Forever", onClick: onSaveForever },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A", onClick: onSelectAll },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "About Text Editor", onClick: () => alert("Simple text editor for portfolio file sections.") },
      ],
    },
  ];

  return (
    <div className="menubar">
      {menus.map((menu) => (
        <div key={menu.label} className="menubar-menu">
          <button
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
