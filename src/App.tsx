import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import type { WindowState } from "./types/desktop";
import { FOLDERS } from "./types/desktop";
import { THEMES } from "./types/themes";
import Desktop from "./components/Desktop";
import Taskbar from "./components/Taskbar";
import Window from "./components/Window";
import { AboutMe } from "./components/windows";
import FileExplorer from "./components/FileExplorer";
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
  projects: { ...createWindow("projects", "Desktop", 2), isOpen: false },
  blog: { ...createWindow("blog", "Desktop", 3), isOpen: false },
  github: { ...createWindow("github", "Desktop", 4), isOpen: false },
  speaking: { ...createWindow("speaking", "Desktop", 5), isOpen: false },
};

const CASCADE_STEP = 14;
const CASCADE_LIMIT = 800;

function App() {
  const [windows, setWindows] = useState<Record<string, WindowState>>(INITIAL_WINDOWS);
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const [nextZ, setNextZ] = useState(6);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("portfolio-theme") || "pixel";
  });
  const basePos = useMemo(
    () => ({
      x: Math.max(0, (window.innerWidth - 560) / 2),
      y: Math.max(0, (window.innerHeight - 400 - 40) / 2),
    }),
    [],
  );
  const cascadeCount = useRef(0);
  const cascaded = useRef(new Set<string>());
  const [fileContents, setFileContents] = useState<Record<string, ReactNode>>({});
  const nextFileId = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  const openFolder = useCallback(
    (id: string) => {
      const existing = windowsRef.current[id];
      if (existing?.isOpen) {
        setWindows((prev) => {
          const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
          return { ...prev, [id]: { ...existing, isMinimized: false, zIndex: maxZ + 1 } };
        });
        return;
      }

      const z = nextZ;
      setNextZ((prev) => prev + 1);

      setWindows((prev) => {
        const w = prev[id];
        if (!w) return prev;
        return { ...prev, [id]: { ...w, isOpen: true, isMinimized: false, zIndex: z } };
      });

      cascadeCount.current += 1;
      cascaded.current.add(id);
      const pos = {
        x: Math.min(basePos.x + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
        y: Math.min(basePos.y + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
      };

      setWindows((prev) => {
        const w = prev[id];
        if (!w || !w.isOpen) return prev;
        return { ...prev, [id]: { ...w, position: pos } };
      });
    },
    [nextZ, basePos],
  );

  const setWindowTitle = useCallback((id: string, title: string) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], title } }));
  }, []);

  const openFile = useCallback(
    (title: string, detail: ReactNode) => {
      const id = `file-${nextFileId.current++}`;
      const z = nextZ;
      setFileContents((prev) => ({ ...prev, [id]: detail }));

      cascadeCount.current += 1;
      cascaded.current.add(id);
      const pos = {
        x: Math.min(basePos.x + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
        y: Math.min(basePos.y + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
      };

      setWindows((prev) => ({
        ...prev,
        [id]: { ...createWindow(id, title, z), position: pos },
      }));
      setNextZ((z) => z + 1);
    },
    [nextZ, basePos],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], isOpen: false } }));
    setFileContents((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (cascaded.current.has(id)) {
      cascaded.current.delete(id);
      cascadeCount.current = Math.max(0, cascadeCount.current - 1);
    }
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
            {["projects", "blog", "github", "speaking"].includes(w.id) && (
              <FileExplorer
                initialSection={w.id}
                theme={theme}
                onPathChange={(path) => setWindowTitle(w.id, path)}
                onOpenFile={(title, detail) => openFile(title, detail)}
                onOpenAbout={() => openFolder("about")}
              />
            )}
            {w.id.startsWith("file-") && (
              <div className="window-content-inner">{fileContents[w.id]}</div>
            )}
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
