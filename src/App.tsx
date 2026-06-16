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
import { saveSection, saveItem } from "./data/controllers/section";
import { findItemsBySectionId, deleteSection, upsertItem, deleteItem } from "./data/models/section";
import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/app-shell.css";
import "./styles/desktop.css";
import "./styles/window.css";
import "./styles/content.css";
import "./styles/file-browser.css";
import "./styles/file-explorer.css";
import "./styles/taskbar.css";
import "./styles/start-menu.css";
import "./styles/terminal.css";
import "./styles/selection.css";
import "./styles/responsive.css";

function createWindow(id: string, title: string, zIndex: number): WindowState {
  const maxW = Math.min(642, window.innerWidth * 0.92);
  const w = Math.max(280, maxW);
  const h = 430;
  return {
    id,
    title,
    isOpen: true,
    isMinimized: false,
    position: {
      x: Math.max(8, (window.innerWidth - w) / 2),
      y: Math.max(8, (window.innerHeight - h - 40) / 2),
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
      base.add("docs");
      return base;
    } catch {
      return new Set(["about", "docs"]);
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

  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

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
    () => {
      const w = Math.min(642, window.innerWidth * 0.92);
      return {
        x: Math.max(8, (window.innerWidth - w) / 2),
        y: Math.max(8, (window.innerHeight - 430 - 40) / 2),
      };
    },
    [],
  );
  const cascadeCount = useRef(0);
  const cascaded = useRef(new Set<string>());
  const editorRefs = useRef<Record<string, TextEditorHandle>>({});
  const [fileContents, setFileContents] = useState<Record<string, ReactNode>>({});
  const [itemMeta, setItemMeta] = useState<Record<string, { sectionId: string; itemId: string }>>({});
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});

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
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, title } };
    });
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
    },
    [basePos],
  );

  const openItem = useCallback((sectionId: string, itemId: string, itemName: string) => {
    const id = `item-${itemId}`;
    const existing = windowsRef.current[id];
    if (existing?.isOpen) {
      setWindows((prev) => {
        const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
        return { ...prev, [id]: { ...existing, isMinimized: false, zIndex: maxZ + 1 } };
      });
      return;
    }

    setItemMeta((prev) => ({ ...prev, [id]: { sectionId, itemId } }));

    cascadeCount.current += 1;
    cascaded.current.add(id);
    const pos = {
      x: Math.min(basePos.x + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
      y: Math.min(basePos.y + cascadeCount.current * CASCADE_STEP, CASCADE_LIMIT),
    };

    setWindows((prev) => {
      const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
      return { ...prev, [id]: { ...createWindow(id, itemName, maxZ + 1), position: pos } };
    });
  }, [basePos]);

  const onOpenHelp = useCallback(() => {
    const helpContent = (
      <div className="help-inner">
        <h2 className="help-heading">About Text Editor</h2>
        <p className="help-paragraph">The Text Editor opens when you double-click or open a file. It has two modes: <strong>Preview</strong> (markdown rendered) and <strong>Edit</strong> (raw textarea).</p>

        <h3 className="help-subheading">📂 File Menu</h3>
        <ul className="help-list">
          <li><strong>Save</strong> (<code className="help-inline-code">Ctrl+S</code>) — saves content to database</li>
          <li><strong>Preview / Edit</strong> — toggles between rendered preview and raw textarea</li>
          <li><strong>Save Forever</strong> — saves and locks the file as read-only</li>
        </ul>

        <h3 className="help-subheading">✂️ Selection Menu</h3>
        <ul className="help-list">
          <li><strong>Select All</strong> (<code className="help-inline-code">Ctrl+A</code>) — selects all text in the editor</li>
        </ul>

        <h3 className="help-subheading">📋 Directives</h3>
        <p className="help-paragraph-sm">Write these at the top of your file to add metadata:</p>
        <ul className="help-list">
          <li><code className="help-inline-code">[title: My Title]</code> — section title (multiple allowed)</li>
          <li><code className="help-inline-code">[description: Text...]</code> — short description (multiple allowed)</li>
          <li><code className="help-inline-code">[tags: tag1, tag2]</code> — skill tags</li>
          <li><code className="help-inline-code">[meta: key=value]</code> — custom key-value pairs</li>
        </ul>

        <h3 className="help-subheading">📝 Markdown Reference</h3>
        <p className="help-paragraph-sm">Everything below the directives is rendered as GitHub-Flavored Markdown:</p>
        <ul className="help-list">
          <li><strong># Heading</strong> → <strong>## Heading</strong> → <strong>###### Heading</strong> — section headings (h1–h6)</li>
          <li><strong>**bold**</strong>, <strong>*italic*</strong>, <strong>~~strikethrough~~</strong> — text emphasis</li>
          <li><strong>- item</strong> or <strong>1. item</strong> — unordered / ordered lists</li>
          <li><strong>[text](url)</strong> — links, <strong>![alt](src)</strong> — images</li>
          <li><strong>```</strong> — fenced code blocks (syntax-highlighted, selectable for copy)</li>
          <li><strong>`code`</strong> — inline code</li>
          <li><strong>| col1 | col2 |</strong> — tables (GFM)</li>
          <li><strong>&gt; quote</strong> — blockquotes, <strong>---</strong> — horizontal rules</li>
        </ul>

        <h3 className="help-subheading">⌨️ Shortcuts</h3>
        <ul>
          <li><code className="help-inline-code">Ctrl+S</code> — save file</li>
          <li><code className="help-inline-code">Ctrl+A</code> — select all text</li>
          <li><code className="help-inline-code">Enter</code> — confirm / save rename</li>
          <li><code className="help-inline-code">Escape</code> — cancel rename</li>
        </ul>
      </div>
    );
    openFile("help", helpContent);
  }, [openFile]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, isOpen: false } };
    });
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
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, isMinimized: !w.isMinimized } };
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const maxZ = Math.max(...Object.values(prev).map((w) => w.zIndex));
      return { ...prev, [id]: { ...w, zIndex: maxZ + 1 } };
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, position: { x, y } } };
    });
  }, []);

  const resizeWindow = useCallback((id: string, w: number, h: number) => {
    setWindows((prev) => {
      const win = prev[id];
      if (!win) return prev;
      return { ...prev, [id]: { ...win, size: { width: w, height: h } } };
    });
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

  const uniqueLabel = useCallback((base: string): string => {
    const existing = getSections().map((s) => s.label);
    if (!existing.includes(base)) return base;
    let n = 2;
    while (existing.includes(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }, []);

  const onNewFolder = useCallback((id: string, label: string) => {
    const db = initDb();
    if (db) {
      saveSection(db, { id, label: uniqueLabel(label), type: "folder" });
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, [uniqueLabel]);

  const onNewFile = useCallback((id: string, label: string) => {
    const db = initDb();
    if (db) {
      const uniqueName = uniqueLabel(label);
      saveSection(db, { id, label: uniqueName, type: "file" });
      saveItem(db, {
        id: `${id}-item`,
        section_id: id,
        title: uniqueName,
        body: "",
        sort_order: 0,
      });
      persistDb();
      setRefreshKey((k) => k + 1);
    }
  }, [uniqueLabel]);

  const onDropFileIntoFolder = useCallback((fileSectionId: string, folderSectionId: string) => {
    const db = initDb();
    if (!db) return;

    const items = findItemsBySectionId(db, fileSectionId);
    let n = 0;
    for (const item of items) {
      upsertItem(db, {
        id: `${fileSectionId}-moved-${Date.now()}-${n}`,
        section_id: folderSectionId,
        title: item.title,
        description: item.description ?? undefined,
        date: item.date ?? undefined,
        tags: item.tags ? JSON.parse(item.tags) : undefined,
        body: item.body ?? undefined,
        url: item.url ?? undefined,
        meta: item.meta_json ? JSON.parse(item.meta_json) : undefined,
        sort_order: item.sort_order,
      });
      n++;
    }

    deleteSection(db, fileSectionId);
    persistDb();
    onDbChange();

    setWindows((prev) => {
      const w = prev[fileSectionId];
      if (!w) return prev;
      return { ...prev, [fileSectionId]: { ...w, isOpen: false } };
    });
  }, [onDbChange]);

  const onDropItemFromFolder = useCallback((sectionId: string, itemName: string, pixelX: number, pixelY: number) => {
    const db = initDb();
    if (!db) return;

    const items = findItemsBySectionId(db, sectionId);
    const item = items.find((i) => i.title === itemName);
    if (!item) return;

    const newId = `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const label = uniqueLabel(itemName);

    saveSection(db, { id: newId, label, type: "file" });
    saveItem(db, {
      id: `item-${Date.now()}`,
      section_id: newId,
      title: item.title,
      description: item.description ?? undefined,
      date: item.date ?? undefined,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
      body: item.body ?? undefined,
      url: item.url ?? undefined,
      meta: item.meta_json ? JSON.parse(item.meta_json) : undefined,
      sort_order: 0,
    });
    deleteItem(db, item.id);
    persistDb();

    try {
      const saved = localStorage.getItem("portfolio-desktop-positions");
      const positions = saved ? JSON.parse(saved) : {};
      positions[newId] = { x: Math.round(pixelX / 100) * 100, y: Math.round(pixelY / 110) * 110 };
      localStorage.setItem("portfolio-desktop-positions", JSON.stringify(positions));
    } catch { /* ignore */ }

    onDbChange();
  }, [uniqueLabel, onDbChange]);

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
  const maxZ = Math.max(...windowList.filter((w) => w.isOpen).map((w) => w.zIndex), 0);

  return (
    <div className="app" role="application" aria-label="Portfolio Desktop">
      <Desktop key={`desktop-${theme}`} folders={folders} theme={theme} onOpenFolder={openFolder} onRenameSection={onRenameSection} onDeleteSection={onDeleteSection} onNewFolder={onNewFolder} onNewFile={onNewFile} onRefresh={onDbChange} onDropFileIntoFolder={onDropFileIntoFolder} onDropItemFromFolder={onDropItemFromFolder} />
      {windowList
        .filter((w) => w.isOpen)
        .map((w) => {
          const section = folderMap.get(w.id);
          const isFileSection = section && section.type === "file";
          const isUnlockedFile = isFileSection && !lockedSections.has(w.id);
          const isLockedFile = isFileSection && lockedSections.has(w.id);

          const isItemUnlocked = w.id.startsWith("item-") && !lockedSections.has(w.id);
          const fileNavbar = isUnlockedFile ? (
            <FileNavbar
              onSave={() => editorRefs.current[w.id]?.save()}
              onPreview={() => setPreviewing((prev) => ({ ...prev, [w.id]: prev[w.id] === undefined ? false : !prev[w.id] }))}
              previewing={previewing[w.id] !== false}
              onSelectAll={() => editorRefs.current[w.id]?.selectAll()}
              onSaveForever={() => handleSaveForever(w.id)}
              onOpenHelp={onOpenHelp}
            />
          ) : isItemUnlocked ? (
            <FileNavbar
              onSave={() => editorRefs.current[w.id]?.save()}
              onPreview={() => setPreviewing((prev) => ({ ...prev, [w.id]: prev[w.id] === undefined ? false : !prev[w.id] }))}
              previewing={previewing[w.id] !== false}
              onSelectAll={() => editorRefs.current[w.id]?.selectAll()}
              onSaveForever={() => handleSaveForever(w.id)}
              onOpenHelp={onOpenHelp}
            />
          ) : undefined;

          return (
            <Window
              key={w.id}
              win={w}
              isActive={w.zIndex === maxZ}
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
              ) : isLockedFile ? (
                <TextEditor
                  sectionId={w.id}
                  sectionLabel={section!.label}
                  locked
                />
              ) : isUnlockedFile ? (
                <TextEditor
                  ref={(el) => { if (el) editorRefs.current[w.id] = el; }}
                  sectionId={w.id}
                  sectionLabel={section!.label}
                  onDbChange={onDbChange}
                  preview={previewing[w.id] !== false}
                />
              ) : section && section.type === "folder" ? (
                <FileExplorer
                  key={`explorer-${refreshKey}`}
                  initialSection={w.id}
                  theme={theme}
                  onPathChange={(path) => setWindowTitle(w.id, path)}
                  onOpenFile={(title, detail) => openFile(title, detail)}
                  onOpenSection={(id) => openFolder(id)}
                  onOpenAbout={() => openFolder("about")}
                  onOpenItem={(sectionId, itemId, itemName) => openItem(sectionId, itemId, itemName)}
                />
              ) : w.id.startsWith("item-") && itemMeta[w.id] ? (
                <TextEditor
                  ref={(el) => { if (el) editorRefs.current[w.id] = el; }}
                  sectionId={itemMeta[w.id]!.sectionId}
                  itemId={itemMeta[w.id]!.itemId}
                  sectionLabel={w.title}
                  onDbChange={onDbChange}
                  preview={previewing[w.id] !== false}
                  locked={lockedSections.has(w.id)}
                />
              ) : null}
              {w.id.startsWith("file-") && <div className="window-content-inner">{fileContents[w.id]}</div>}
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
