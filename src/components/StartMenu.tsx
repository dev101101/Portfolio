import type { Theme } from "../types/themes";

interface StartMenuProps {
  themes: Theme[];
  currentTheme: string;
  onSelectTheme: (id: string) => void;
  onClose: () => void;
}

function StartMenu({ themes, currentTheme, onSelectTheme, onClose }: StartMenuProps) {
  return (
    <>
      <div className="start-overlay" onClick={onClose} aria-hidden="true" />
      <div className="start-menu" role="menu" aria-label="Theme selector">
        <div className="start-menu-title">Portfolio OS</div>
        <div className="start-menu-section">
          <div className="start-menu-section-title">Themes</div>
          {themes.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={currentTheme === t.id}
              className={`start-menu-item${currentTheme === t.id ? " selected" : ""}`}
              onClick={() => {
                onSelectTheme(t.id);
                onClose();
              }}
            >
              <span className="start-menu-item-name">{t.name}</span>
              <span className="start-menu-item-desc">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default StartMenu;
