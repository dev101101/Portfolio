import { useState, useMemo } from "react";
import type { WindowState } from "../types/desktop";
import type { Theme } from "../types/themes";
import Clock from "./Clock";
import StartMenu from "./StartMenu";
import LangSwitcher from "./LangSwitcher";
import { useT } from "../context/language";

interface TaskbarProps {
  windows: WindowState[];
  themes: Theme[];
  currentTheme: string;
  onSelectTheme: (id: string) => void;
  onToggleMinimize: (id: string) => void;
  onFocus: (id: string) => void;
}

export default function Taskbar({
  windows,
  themes,
  currentTheme,
  onSelectTheme,
  onToggleMinimize,
  onFocus,
}: TaskbarProps) {
  const { t } = useT();
  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <StartMenuButton
        themes={themes}
        currentTheme={currentTheme}
        onSelectTheme={onSelectTheme}
      />
      <div className="taskbar-items" role="tablist" aria-label={t("taskbar.windowsList")}>
        {windows
          .filter((w) => w.isOpen)
          .map((w) => (
            <button
              key={w.id}
              role="tab"
              aria-selected={!w.isMinimized}
              aria-label={w.title}
              className={`taskbar-item${w.isMinimized ? "" : " active"}`}
              onMouseDown={() => {
                if (w.isMinimized) {
                  onToggleMinimize(w.id);
                  onFocus(w.id);
                } else {
                  onToggleMinimize(w.id);
                }
              }}
            >
              {w.title}
            </button>
          ))}
      </div>
      <LangSwitcher />
      <AppsButton
        windows={windows}
        onToggleMinimize={onToggleMinimize}
        onFocus={onFocus}
      />
      <Clock />
    </div>
  );
}

function AppsButton({
  windows,
  onToggleMinimize,
  onFocus,
}: {
  windows: WindowState[];
  onToggleMinimize: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const openWindows = useMemo(() => windows.filter((w) => w.isOpen), [windows]);

  return (
    <div className="taskbar-apps-wrapper">
      {openWindows.length > 0 && (
        <button
          className="taskbar-apps"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("taskbar.openWindows", { count: openWindows.length })}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {t("taskbar.apps.count", { count: openWindows.length })}
        </button>
      )}
      {open && (
        <>
          <div className="apps-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="apps-menu" role="menu" aria-label={t("taskbar.windowsList")}>
            {openWindows.map((w) => (
              <button
                key={w.id}
                role="menuitem"
                className={`apps-menu-item${w.isMinimized ? "" : " active"}`}
                onClick={() => {
                  if (w.isMinimized) {
                    onToggleMinimize(w.id);
                    onFocus(w.id);
                  } else {
                    onToggleMinimize(w.id);
                  }
                  setOpen(false);
                }}
              >
                <span className="apps-menu-item-name">{w.title}</span>
                <span className="apps-menu-item-desc">{w.isMinimized ? t("taskbar.minimized") : t("taskbar.active")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StartMenuButton({
  themes,
  currentTheme,
  onSelectTheme,
}: {
  themes: Theme[];
  currentTheme: string;
  onSelectTheme: (id: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`taskbar-start${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t("taskbar.openThemeMenu")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t("taskbar.themes")}
      </button>
      {open && (
        <StartMenu
          themes={themes}
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
