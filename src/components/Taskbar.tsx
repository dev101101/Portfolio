import { useState } from "react";
import type { WindowState } from "../types/desktop";
import type { Theme } from "../types/themes";
import Clock from "./Clock";
import StartMenu from "./StartMenu";

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
  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <StartMenuButton
        themes={themes}
        currentTheme={currentTheme}
        onSelectTheme={onSelectTheme}
      />
      <div className="taskbar-items" role="tablist" aria-label="Open windows">
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
      <Clock />
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`taskbar-start${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open theme menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Themes
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
