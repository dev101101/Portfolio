import { useState, useCallback, useEffect, useRef } from "react";
import type { WindowState } from "./types/desktop";
import { FOLDERS } from "./types/desktop";
import { THEMES } from "./types/themes";
import Desktop from "./components/Desktop";
import Taskbar from "./components/Taskbar";
import Window from "./components/Window";
import { AboutMe, Projects, Blog, GitHub, Speaking } from "./components/windows";
import "./styles/App.css";

function createWindow(id: string, title: string, zIndex: number): WindowState {
  const w = 560;
  const h = 400;
  return {
    id,
    title,
    isOpen: true,
    isMinimized: false,
    position: {
      x: Math.max(0, (window.innerWidth - w) / 2),
      y: Math.max(0, (window.innerHeight - h - 40) / 2),
    },
    size: { width: w, height: h },
    zIndex,
  };
}

const INITIAL_WINDOWS: Record<string, WindowState> = {
  about: { ...createWindow("about", "About Me", 1), isOpen: true },
  projects: { ...createWindow("projects", "Projects", 2), isOpen: false },
  blog: { ...createWindow("blog", "Blog", 3), isOpen: false },
  github: { ...createWindow("github", "GitHub", 4), isOpen: false },
  speaking: { ...createWindow("speaking", "Speaking", 5), isOpen: false },
};

const CASCADE_STEP = 30;
const CASCADE_LIMIT = 200;

function App() {
  const [windows, setWindows] = useState<Record<string, WindowState>>(INITIAL_WINDOWS);
  const [nextZ, setNextZ] = useState(6);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("portfolio-theme") || "pixel";
  });
  const cascadeRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  const openFolder = useCallback(
    (id: string) => {
      setWindows((prev) => {
        const w = prev[id];
        if (!w) return prev;

        const offset = cascadeRef.current;
        const pos = {
          x: offset.x,
          y: offset.y,
        };
        offset.x += CASCADE_STEP;
        offset.y += CASCADE_STEP;
        if (offset.x > CASCADE_LIMIT || offset.y > CASCADE_LIMIT) {
          offset.x = 0;
          offset.y = 0;
        }

        setNextZ((z) => z + 1);
        return {
          ...prev,
          [id]: { ...w, isOpen: true, isMinimized: false, position: pos, zIndex: nextZ },
        };
      });
    },
    [nextZ],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], isOpen: false } }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMinimized: !prev[id].isMinimized },
    }));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
      return { ...prev, [id]: { ...prev[id], zIndex: maxZ + 1 } };
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], position: { x, y } },
    }));
  }, []);

  const resizeWindow = useCallback((id: string, w: number, h: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], size: { width: w, height: h } },
    }));
  }, []);

  const windowList = Object.values(windows);

  return (
    <div className="app">
      <Desktop folders={FOLDERS} theme={theme} onOpenFolder={openFolder} />
      {windowList
        .filter((w) => w.isOpen)
        .map((w) => (
          <Window
            key={w.id}
            win={w}
            onClose={() => closeWindow(w.id)}
            onMinimize={() => minimizeWindow(w.id)}
            onFocus={() => focusWindow(w.id)}
            onMove={(x, y) => moveWindow(w.id, x, y)}
            onResize={(w_, h) => resizeWindow(w.id, w_, h)}
          >
            {w.id === "about" && <AboutMe />}
            {w.id === "projects" && <Projects />}
            {w.id === "blog" && <Blog />}
            {w.id === "github" && <GitHub />}
            {w.id === "speaking" && <Speaking />}
          </Window>
        ))}
      <Taskbar
        windows={windowList}
        themes={THEMES}
        currentTheme={theme}
        onSelectTheme={setTheme}
        onToggleMinimize={minimizeWindow}
        onFocus={focusWindow}
      />
    </div>
  );
}

export default App;
