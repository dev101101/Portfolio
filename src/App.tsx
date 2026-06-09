import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import type { WindowState, Folder } from "./types/desktop";
import { FOLDERS } from "./types/desktop";
import { THEMES } from "./types/themes";
import Desktop from "./components/Desktop";
import Taskbar from "./components/Taskbar";
import Window from "./components/Window";
import FileExplorer from "./components/FileExplorer";
import File from "./components/File";
import Terminal from "./components/Terminal";
import TextEditor from "./components/TextEditor";
import type { TextEditorHandle } from "./components/TextEditor";
import FileNavbar from "./components/FileNavbar";
import { buildProfileDetail } from "./components/buildProfileDetail";
import { getProfile, getSections, initDbAsync, persistDb, initDb } from "./data/db";
import { saveSection } from "./data/controllers/section";
import { deleteSection } from "./data/models/section";
import { findItemsBySectionId } from "./data/models/section";
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

function getDesktopCapacity() {
  const cols = Math.max(1, Math.floor(window.innerWidth / 100));
  const rows = Math.max(1, Math.floor(window.innerHeight / 110));
  return cols * rows;
}

const INITIAL_WINDOWS: Record<string, WindowState> = {
  about: { ...createWindow("about", "About Me", 1), isOpen: true },
  projects: { ...createWindow("projects", "Desktop", 2), isOpen: false },
  blog: { ...createWindow("blog", "Desktop", 3), isOpen: false },
  github: { ...createWindow("github", "Desktop", 4), isOpen: false },
  speaking: { ...createWindow("speaking", "Desktop", 5), isOpen: false },
  terminal: { ...createWindow("terminal", "Terminal", 6), isOpen: false },
};

const CASCADE_STEP = 14;
const CASCADE_LIMIT = 800;

function App() {
  const [windows, setWindows] = useState<Record<string, WindowState>>(INITIAL_WINDOWS);
  const windowsRef = useRef(windows);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  const [, setNextZ] = useState(0);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("portfolio-theme") || "pixel";
  });
  const [aboutDetail, setAboutDetail] = useState<ReactNode | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lockedSections, setLockedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("portfolio-locked-sections");
      const base: Set<string> = saved ? new Set(JSON.parse(saved)) : new Set();
      base.add("about");
      return base;
    } catch {
      return new Set(["about"]);
    }
  });
  const onDbChange = useCallback(() => setRefreshKey((k) => k + 1), []);

  const folders = useMemo(() => {
    if (!dbReady) return FOLDERS;
    void refreshKey;
    const sections = getSections();
    const dbFolders: Folder[] = sections.map((s) => ({
      id: s.id,
      label: s.label,
      type: s.type,
    }));
    dbFolders.push({ id: "terminal", label: "Terminal", type: "terminal" });
    return dbFolders;
  }, [dbReady, refreshKey]);

  const [maxFolders, setMaxFolders] = useState(getDesktopCapacity);
  useEffect(() => {
    const onResize = () => setMaxFolders(getDesktopCapacity());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    initDbAsync().then(() => {
      setAboutDetail(buildProfileDetail(getProfile()));
      setDbReady(true);
    });
  }, []);

  const basePos = useMemo(
    () => ({
      x: Math.max(0, (window.innerWidth - 560) / 2),
      y: Math.max(0, (window.innerHeight - 400 - 40) / 2),
    }),
    [],
  );
  const cascadeCount = useRef(0);
  const cascaded = useRef(new Set<string>());
  const editorRefs = useRef<Record<string, TextEditorHandle>>({});
  const [fileContents, setFileContents] = useState<Record<string, ReactNode>>({});

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

      setNextZ((prev) => prev + 1);

      setWindows((prev) => {
        const w = prev[id];
        if (!w) {
          const allSections = getSections();
          const s = allSections.find((s) => s.id === id);
          const title = s?.label ?? id;
          const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
          return { ...prev, [id]: createWindow(id, title, maxZ + 1) };
        }
        const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
        return { ...prev, [id]: { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 } };
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
    [basePos],
  );

  const setWindowTitle = useCallback((id: string, title: string) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], title } }));
  }, []);

  const openFile = useCallback(
    (title: string, detail: ReactNode) => {
      const id = `file-${title}`;
      const existing = windowsRef.current[id];
      if (existing?.isOpen) {
        setWindows((prev) => {
          const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
          return { ...prev, [id]: { ...existing, isMinimized: false, zIndex: maxZ + 1 } };
        });
        return;
      }

      setFileContents((prev) => ({ ...prev, [id]: detail }));

      cascadeCount.current += 1;
      cascaded.current.add(id);
      const pos = {
        x: Math.min(basePos.x + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
        y: Math.min(basePos.y + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
      };

      setWindows((prev) => {
        const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
        return { ...prev, [id]: { ...createWindow(id, title, maxZ + 1), position: pos } };
      });
      setNextZ((prev) => prev + 1);
    },
    [basePos],
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

  const onRenameSection = useCallback((id: string, label: string) => {
    const db = initDb();
    if (db) {
      const sections = getSections();
      const existing = sections.find((s) => s.id === id);
      saveSection(db, { id, label, type: existing?.type ?? "folder" });
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const onDeleteSection = useCallback((id: string) => {
    const db = initDb();
    if (db) {
      deleteSection(db, id);
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const onNewFolder = useCallback((id: string, label: string) => {
    const db = initDb();
    if (db) {
      saveSection(db, { id, label, type: "folder" });
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const onNewFile = useCallback((id: string, label: string) => {
    const db = initDb();
    if (db) {
      saveSection(db, { id, label, type: "file" });
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const handleSaveForever = useCallback((sectionId: string) => {
    editorRefs.current[sectionId]?.save();
    setLockedSections((prev) => {
      const next = new Set(prev);
      next.add(sectionId);
      localStorage.setItem("portfolio-locked-sections", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const windowList = Object.values(windows);

  return (
    <div className="app">
      <Desktop key={`desktop-${refreshKey}`} folders={folders} theme={theme} onOpenFolder={openFolder} onRenameSection={onRenameSection} onDeleteSection={onDeleteSection} onNewFolder={onNewFolder} onNewFile={onNewFile} onRefresh={onDbChange} />
      {windowList
        .filter((w) => w.isOpen)
        .map((w) => {
          const section = folders.find((f) => f.id === w.id);
          const isFileSection = section && section.type === "file" && !lockedSections.has(w.id);
          const isLockedFile = section && section.type === "file" && lockedSections.has(w.id);

          const fileNavbar = isFileSection ? (
            <FileNavbar
              onSave={() => editorRefs.current[w.id]?.save()}
              onSelectAll={() => editorRefs.current[w.id]?.selectAll()}
              onSaveForever={() => handleSaveForever(w.id)}
            />
          ) : undefined;

          const lockedContent = isLockedFile ? (() => {
            const db = initDb();
            const items = db ? findItemsBySectionId(db, w.id) : [];
            const body = items.length > 0 ? (items[0].body ?? "") : "";
            return (
              <div className="window-content-inner" style={{ padding: 16, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13, lineHeight: 1.5 }}>
                {body}
              </div>
            );
          })() : null;

          return (
            <Window
              key={w.id}
              win={w}
              navbar={fileNavbar}
              onClose={() => closeWindow(w.id)}
              onMinimize={() => minimizeWindow(w.id)}
              onFocus={() => focusWindow(w.id)}
              onMove={(x, y) => moveWindow(w.id, x, y)}
              onResize={(w_, h) => resizeWindow(w.id, w_, h)}
            >
              {w.id === "about" ? (
                aboutDetail ? <File detail={aboutDetail} /> : <div className="window-content-inner"><p>Loading...</p></div>
              ) : w.id === "terminal" ? (
                <Terminal onClose={() => closeWindow(w.id)} onDbChange={onDbChange} maxFolders={maxFolders} />
              ) : isLockedFile ? lockedContent : isFileSection ? (
                <TextEditor
                  ref={(el) => { if (el) editorRefs.current[w.id] = el; }}
                  sectionId={w.id}
                  sectionLabel={section!.label}
                  onDbChange={onDbChange}
                />
              ) : section && section.type === "folder" ? (
                <FileExplorer
                  key={`explorer-${refreshKey}`}
                  initialSection={w.id}
                  theme={theme}
                  onPathChange={(path) => setWindowTitle(w.id, path)}
                  onOpenFile={(title, detail) => openFile(title, detail)}
                  onOpenAbout={() => openFolder("about")}
                />
              ) : null}
              {w.id.startsWith("file-") && (
                <div className="window-content-inner">{fileContents[w.id]}</div>
              )}
            </Window>
          );
        })}
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
