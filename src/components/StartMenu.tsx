import type { Theme } from "../types/themes";
import { useT } from "../context/language";

interface StartMenuProps {
  themes: Theme[];
  currentTheme: string;
  onSelectTheme: (id: string) => void;
  onClose: () => void;
}

function StartMenu({ themes, currentTheme, onSelectTheme, onClose }: StartMenuProps) {
  const { t } = useT();
  return (
    <>
      <div className="start-overlay" onClick={onClose} aria-hidden="true" />
      <div className="start-menu" role="menu" aria-label={t("startMenu.themes")}>
        <div className="start-menu-title">{t("startMenu.title")}</div>
        <div className="start-menu-section">
          <div className="start-menu-section-title">{t("startMenu.themes")}</div>
          {themes.map((th) => (
            <button
              key={th.id}
              role="menuitemradio"
              aria-checked={currentTheme === th.id}
              className={`start-menu-item${currentTheme === th.id ? " selected" : ""}`}
              onClick={() => {
                onSelectTheme(th.id);
                onClose();
              }}
            >
              <span className="start-menu-item-name">{th.name}</span>
              <span className="start-menu-item-desc">{th.description}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default StartMenu;
