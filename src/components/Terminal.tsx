import { useState, useRef, useCallback, useEffect } from "react";
import { initDb, persistDb } from "../data/db";
import { getProfile } from "../data/controllers/profile";
import { getSections, saveSection, saveItem, removeItem } from "../data/controllers/section";
import {
  findAllSections,
  findItemsBySectionId,
  findRootItemsBySectionId,
  findItemsByParentId,
  findItemByNameAndParent,
  findChildrenRecursive,
  deleteSection,
  type ItemRow,
} from "../data/models/section";
import { PROTECTED_IDS } from "../data/constants";

const COMMANDS = [
  "help", "ls", "cd", "pwd", "cat", "tree", "profile", "sections", "items", "sql",
  "add-section", "add-item", "rm-item", "rm-section",
  "mkdir", "touch", "mv", "rm",
  "export", "clear", "exit",
];

interface HistoryEntry {
  input: string;
  output: string;
}

function formatItem(item: ItemRow): string {
  const parts: string[] = [];
  if (item.body) parts.push(item.body);
  if (item.meta_json) {
    const meta = safeJsonParse(item.meta_json);
    if (meta) {
      const lines = Object.entries(meta).map(([k, v]) => `  ${k}: ${v}`);
      parts.push(`[meta]\n${lines.join("\n")}`);
    }
  }
  if (item.tags) {
    const tags = safeJsonParse(item.tags);
    if (Array.isArray(tags) && tags.length) parts.push(`[tags] ${tags.join(", ")}`);
  }
  if (item.description) parts.push(`[description] ${item.description}`);
  if (item.url) parts.push(`[url] ${item.url}`);
  if (item.date) parts.push(`[date] ${item.date}`);
  return parts.join("\n\n") || "(no content)";
}

function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "No rows found.";
  const cols = Object.keys(rows[0]!);
  const colWidths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const sep = colWidths.map((w) => "-".repeat(w + 2)).join("+");
  const header = cols.map((c, i) => c.padEnd(colWidths[i]!)).join(" | ");
  const lines = rows.map((r) =>
    cols.map((c, i) => String(r[c] ?? "").padEnd(colWidths[i]!)).join(" | "),
  );
  return ` ${sep}\n| ${header} |\n ${sep}\n${lines.map((l) => `| ${l} |`).join("\n")}\n ${sep}`;
}

// --- Path resolution helpers ---

interface ResolvedPath {
  sectionId: string;
  parentItemId: string | null;
  itemName?: string;
}

function resolveSectionPath(db: ReturnType<typeof initDb>, parts: string[]): ResolvedPath | { error: string } {
  if (!db) return { error: "Database not ready." };
  if (parts.length === 0 || parts[0] === "") return { error: "No path specified." };
  const sections = findAllSections(db);
  const section = sections.find((s) => s.id === parts[0] || s.label === parts[0]);
  if (!section) return { error: `No such section: "${parts[0]}"` };
  if (parts.length === 1) return { sectionId: section.id, parentItemId: null };
  let parentId: string | null = null;
  for (let i = 1; i < parts.length; i++) {
    const item = findItemByNameAndParent(db, section.id, parts[i]!, parentId);
    if (!item) return { error: `No such item: "${parts[i]}" in path` };
    if (i < parts.length - 1) {
      const meta = item.meta_json ? safeJsonParse(item.meta_json) : null;
      if (meta?.itemType !== "folder") return { error: `"${parts[i]}" is not a folder` };
    }
    parentId = item.id;
  }
  return { sectionId: section.id, parentItemId: parentId, itemName: parts[parts.length - 1] };
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s); } catch { return null; }
}

function runCommand(input: string, cwd: string, maxFolders: number): { output: string; newCwd?: string; didMutate?: boolean } {
  const db = initDb();
  if (!db) return { output: "Database is initializing. Please wait..." };
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  // --- Helpers to resolve cwd ---
  const resolveCwd = (): { sectionId: string; parentItemId: string | null } | null => {
    if (cwd === "/") return null;
    const segs = cwd.replace(/^\/+/, "").split("/").filter(Boolean);
    const r = resolveSectionPath(db, segs);
    if ("error" in r) return null;
    return { sectionId: r.sectionId, parentItemId: r.parentItemId };
  };

  const cwdSection = resolveCwd();

  const dirParts = (p: string): string[] =>
    p.replace(/^\/+/, "").split("/").filter(Boolean);

  switch (cmd) {
    case "help":
      return { output: [
        "Available commands:",
        "  help                  show this message",
        "  ls [path]             list directory contents",
        "  cd <path>             change directory",
        "  pwd                   print working directory",
        "  cat <path>            show item content",
        "  tree [path]           show hierarchical tree",
        "  profile               show profile info",
        "  sections              list all sections (table)",
        "  items <section_id>    list items in section (table)",
        "  sql <query>           run SQL query (SELECT free; mutations need --force)",
        "  add-section <id> <label> [type]  create a new section",
        "  add-item <section_id> <title>    add item to section (root level)",
        "  rm-item <id>          delete item by ID",
        "  rm-section <id>       delete section by ID",
        "  mkdir <path>          create a folder at path",
        "  touch <path>          create a file at path",
        "  mv <src> <dst-dir>    move item to another folder",
        "  rm <path>             delete item by path",
        "  export                export database as JSON",
        "  clear                 clear screen",
        "  exit                  close terminal",
        "",
        "  Ctrl+L  clear    Ctrl+C  cancel    Ctrl+D  exit    Tab  autocomplete",
      ].join("\n") };

    case "clear":
      return { output: "__CLEAR__" };

    case "exit":
      return { output: "__EXIT__" };

    case "pwd":
      return { output: cwd };

    case "ls": {
      const target = parts.slice(1).join(" ") || cwd;
      const segs = dirParts(target);
      if (segs.length === 0) {
        const secs = findAllSections(db);
        return { output: secs.map((s) => (s.type === "folder" ? "📁 " : "📄 ") + s.label + "/").join("\n") || "(empty)" };
      }
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: `ls: ${target}: ${r.error}` };
      const items = r.parentItemId === null
        ? findRootItemsBySectionId(db, r.sectionId)
        : findItemsByParentId(db, r.parentItemId);
      if (items.length === 0) return { output: "(empty)" };
      return { output: items.map((i) => {
        const meta = i.meta_json ? safeJsonParse(i.meta_json) : null;
        const icon = meta?.itemType === "folder" ? "📁 " : "📄 ";
        return icon + i.title + (i.url ? " -> " + i.url : "");
      }).join("\n") };
    }

    case "cd": {
      const target = parts.slice(1).join(" ").trim();
      if (!target || target === "/" || target === "~") return { output: "", newCwd: "/" };
      if (target === "..") {
        const parent = cwd.split("/").slice(0, -1).join("/") || "/";
        return { output: "", newCwd: parent };
      }
      const segs = dirParts(target);
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: `cd: ${target}: ${r.error}` };
      const newPath = "/" + r.sectionId + (r.parentItemId ? "/" + segs.slice(1).join("/") : "");
      return { output: "", newCwd: newPath };
    }

    case "cat": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: "Usage: cat <path>" };
      const segs = dirParts(target);
      if (segs.length === 1 && cwdSection) {
        const item = findItemByNameAndParent(db, cwdSection.sectionId, segs[0]!, cwdSection.parentItemId);
        if (item) return { output: formatItem(item) };
      }
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: `cat: ${target}: ${r.error}` };
      const item = r.itemName
        ? findItemByNameAndParent(db, r.sectionId, r.itemName, r.parentItemId)
        : null;
      if (!item) return { output: `cat: ${target}: No such file` };
      return { output: formatItem(item) };
    }

    case "tree": {
      const target = parts[1] ? parts.slice(1).join(" ") : "/";
      const segs = dirParts(target);
      const lines: string[] = [];
      if (segs.length === 0) {
        const secs = findAllSections(db);
        lines.push("/");
        for (let i = 0; i < secs.length; i++) {
          const s = secs[i]!;
          const isLast = i === secs.length - 1;
          lines.push((isLast ? "└── " : "├── ") + s.label + "/");
          const rootItems = findRootItemsBySectionId(db, s.id);
          for (let j = 0; j < rootItems.length; j++) {
            const it = rootItems[j]!;
            const itLast = j === rootItems.length - 1;
            const meta = it.meta_json ? safeJsonParse(it.meta_json) : null;
            lines.push((isLast ? "    " : "│   ") + (itLast ? "└── " : "├── ") + it.title + (meta?.itemType === "folder" ? "/" : ""));
          }
        }
      } else {
        const r = resolveSectionPath(db, segs);
        if ("error" in r) return { output: `tree: ${target}: ${r.error}` };
        const items = r.parentItemId === null
          ? findRootItemsBySectionId(db, r.sectionId)
          : findItemsByParentId(db, r.parentItemId);
        lines.push("/" + segs.join("/"));
        for (let i = 0; i < items.length; i++) {
          const it = items[i]!;
          const isLast = i === items.length - 1;
          lines.push((isLast ? "└── " : "├── ") + it.title);
        }
      }
      return { output: lines.join("\n") };
    }

    case "profile": {
      const p = getProfile(db);
      if (!p) return { output: "No profile found." };
      return { output: `Name: ${p.name}\nTagline: ${p.tagline}\nBio: ${p.bio.slice(0, 200)}${p.bio.length > 200 ? "..." : ""}\nSkills: ${p.skills.join(", ")}` };
    }

    case "sections": {
      const sectionList = findAllSections(db);
      if (sectionList.length === 0) return { output: "No sections found." };
      return { output: formatTable(sectionList.map((s) => ({ id: s.id, label: s.label, type: s.type, order: s.sort_order }))) };
    }

    case "items": {
      const sectionId = parts[1];
      if (!sectionId) return { output: "Usage: items <section_id>" };
      const itemList = findItemsBySectionId(db, sectionId);
      if (itemList.length === 0) return { output: `No items in section "${sectionId}".` };
      return { output: formatTable(
        itemList.map((i) => ({
          id: i.id,
          title: i.title.length > 40 ? i.title.slice(0, 40) + "..." : i.title,
          parent: i.parent_item_id ?? "(root)",
        })),
      ) };
    }

    case "sql": {
      const query = trimmed.slice(4).trim();
      if (!query) return { output: "Usage: sql <query>" };
      const isDDL = /^\s*(CREATE|DROP|ALTER|PRAGMA)\b/i.test(query);
      const isMutation = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(query);
      const isDanger = parts.includes("--danger");
      const isForce = parts.includes("--force");
      if (isDDL && !isDanger) {
        return { output: "⚠️  DDL blocked (CREATE/DROP/ALTER). Use `--danger` flag to allow." };
      }
      if (isMutation && !isForce) {
        return { output: "⚠️  Mutation query detected. Use `--force` flag to execute.\n  Query: " + query.slice(0, 120) + (query.length > 120 ? "..." : "") };
      }
      try {
        const results = db.exec(query);
        if (results.length === 0) return { output: "Query executed (no results).", didMutate: isMutation || isDDL };
        return { output: results
          .map((r) => {
            const rows = r.values.map((row) => {
              const obj: Record<string, unknown> = {};
              r.columns.forEach((col, i) => {
                obj[col] = row[i];
              });
              return obj;
            });
            return formatTable(rows);
          })
          .join("\n\n") };
      } catch (e) {
        return { output: `Error: ${(e as Error).message}` };
      }
    }

    case "add-section": {
      const id = parts[1];
      const label = parts[2];
      const type = parts[3] as "file" | "folder" | "terminal" | undefined;
      if (!id || !label) return { output: "Usage: add-section <id> <label> [file|folder|terminal]" };
      const allSections = findAllSections(db);
      if (allSections.some((s) => s.id === id)) {
        return { output: `Error: Section "${id}" already exists.` };
      }
      if (type === "terminal" && allSections.some((s) => s.type === "terminal")) {
        return { output: "Error: A terminal section already exists. Only one terminal is allowed." };
      }
      if (allSections.length + 1 >= maxFolders) {
        return { output: `Error: Desktop is full (max ${maxFolders} folders). Delete some sections first.` };
      }
      saveSection(db, { id, label, type: type === "folder" ? "folder" : type === "terminal" ? "terminal" : "file" });
      return { output: `Section "${id}" created.`, didMutate: true };
    }

    case "add-item": {
      const secId = parts[1];
      const title = parts.slice(2).join(" ");
      if (!secId || !title) return { output: "Usage: add-item <section_id> <title>" };
      if (PROTECTED_IDS.includes(secId)) return { output: `Error: Cannot modify protected section "${secId}".` };
      saveItem(db, {
        id: `manual-${Date.now()}`,
        section_id: secId,
        title,
      });
      return { output: `Item "${title}" added to section "${secId}".`, didMutate: true };
    }

    case "rm-item": {
      const id = parts[1];
      if (!id) return { output: "Usage: rm-item <id>" };
      const allSections = findAllSections(db);
      let protectedSection = false;
      for (const s of allSections) {
        if (PROTECTED_IDS.includes(s.id)) {
          const items = findItemsBySectionId(db, s.id);
          if (items.some((i) => i.id === id)) {
            protectedSection = true;
            break;
          }
        }
      }
      if (protectedSection) return { output: `Error: Cannot delete item from protected section.` };
      removeItem(db, id);
      return { output: `Item "${id}" deleted.`, didMutate: true };
    }

    case "rm-section": {
      const id = parts[1];
      if (!id) return { output: "Usage: rm-section <id>" };
      if (PROTECTED_IDS.includes(id)) return { output: `Error: Cannot delete protected section "${id}".` };
      deleteSection(db, id);
      return { output: `Section "${id}" and its items deleted.`, didMutate: true };
    }

    // --- New nested folder commands ---

    case "mkdir": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: "Usage: mkdir <section/path/to/folder>" };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: "Usage: mkdir <section_id>/<folder_name> (e.g. mkdir projects/my-folder)" };
      const r = resolveSectionPath(db, segs.slice(0, -1));
      if ("error" in r) return { output: `mkdir: ${r.error}` };
      const name = segs[segs.length - 1]!;
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: `Error: Cannot modify protected section "${r.sectionId}".` };
      const existing = findItemByNameAndParent(db, r.sectionId, name, r.parentItemId);
      if (existing) return { output: `mkdir: "${name}" already exists.` };
      saveItem(db, {
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section_id: r.sectionId,
        parent_item_id: r.parentItemId,
        title: name,
        meta: { itemType: "folder" },
      });
      return { output: `Folder "${name}" created.`, didMutate: true };
    }

    case "touch": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: "Usage: touch <section/path/to/file>" };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: "Usage: touch <section_id>/<file_name> (e.g. touch projects/notes)" };
      const r = resolveSectionPath(db, segs.slice(0, -1));
      if ("error" in r) return { output: `touch: ${r.error}` };
      const name = segs[segs.length - 1]!;
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: `Error: Cannot modify protected section "${r.sectionId}".` };
      const existing = findItemByNameAndParent(db, r.sectionId, name, r.parentItemId);
      if (existing) return { output: `touch: "${name}" already exists.` };
      saveItem(db, {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section_id: r.sectionId,
        parent_item_id: r.parentItemId,
        title: name,
      });
      return { output: `File "${name}" created.`, didMutate: true };
    }

    case "mv": {
      const srcRaw = parts[1];
      const dstRaw = parts[2];
      if (!srcRaw || !dstRaw) return { output: "Usage: mv <src_path> <dest_folder_path>" };
      const srcSegs = dirParts(srcRaw);
      const dstSegs = dirParts(dstRaw);
      if (srcSegs.length < 2) return { output: "mv: src must include section (e.g. projects/file)" };
      if (dstSegs.length < 2) return { output: "mv: dest must include section (e.g. projects/folder)" };
      const srcR = resolveSectionPath(db, srcSegs);
      if ("error" in srcR) return { output: `mv: src: ${srcR.error}` };
      const dstR = resolveSectionPath(db, dstSegs);
      if ("error" in dstR) return { output: `mv: dst: ${dstR.error}` };
      if (PROTECTED_IDS.includes(srcR.sectionId) || PROTECTED_IDS.includes(dstR.sectionId)) {
        return { output: "Error: Cannot move items in/out of protected sections." };
      }
      if (!srcR.itemName) return { output: "mv: src must point to an item" };
      const srcItem = findItemByNameAndParent(db, srcR.sectionId, srcR.itemName, srcR.parentItemId);
      if (!srcItem) return { output: "mv: src item not found" };
      saveItem(db, {
        id: srcItem.id,
        section_id: srcItem.section_id,
        parent_item_id: dstR.parentItemId,
        title: srcItem.title,
        body: srcItem.body ?? undefined,
        description: srcItem.description ?? undefined,
        date: srcItem.date ?? undefined,
        tags: srcItem.tags ? (safeJsonParse(srcItem.tags) as string[]) : undefined,
        url: srcItem.url ?? undefined,
        meta: srcItem.meta_json ? (safeJsonParse(srcItem.meta_json) as Record<string, string>) : undefined,
        sort_order: srcItem.sort_order,
      });
      return { output: `Moved "${srcR.itemName}" to target folder.`, didMutate: true };
    }

    case "rm": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: "Usage: rm <path> (e.g. rm projects/my-file)" };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: "Usage: rm <section_id>/<item_name>" };
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: `rm: ${r.error}` };
      if (!r.itemName) return { output: "rm: cannot remove a section (use rm-section)" };
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: `Error: Cannot delete item from protected section.` };
      const item = findItemByNameAndParent(db, r.sectionId, r.itemName, r.parentItemId);
      if (!item) return { output: `rm: "${r.itemName}" not found.` };
      const children = findChildrenRecursive(db, item.id);
      for (const child of children) removeItem(db, child.id);
      removeItem(db, item.id);
      return { output: `"${r.itemName}" and ${children.length} child items deleted.`, didMutate: true };
    }

    case "export": {
      const data = {
        profile: getProfile(db),
        sections: getSections(db),
      };
      return { output: JSON.stringify(data, null, 2) };
    }

    default:
      return { output: `Unknown command: ${cmd}. Type "help" for available commands.` };
  }
}

function Prompt({ cwd }: { cwd: string }) {
  return (
    <span>
      <span style={{ color: "#00aa00" }}>user@portfolio</span>
      <span style={{ color: "#fff" }}>:</span>
      <span style={{ color: "#0055ff" }}>{cwd}</span>
      <span style={{ color: "#fff" }}>$ </span>
    </span>
  );
}

interface TerminalProps {
  onClose?: () => void;
  onDbChange?: () => void;
  maxFolders?: number;
}

function Terminal({ onClose, onDbChange, maxFolders = 999 }: TerminalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { input: "", output: "Portfolio DB Terminal v1.0\nType 'help' for available commands." },
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("/");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setHistory((prev) => [...prev, { input: value, output: "" }]);
        return;
      }
      const result = runCommand(value, cwd, maxFolders);

      if (result.output === "__CLEAR__") {
        setHistory([]);
        setCommandHistory((prev) => [...prev, value]);
        setHistoryIndex(-1);
        return;
      }

      if (result.output === "__EXIT__") {
        onClose?.();
        return;
      }

      if (result.newCwd !== undefined) {
        setCwd(result.newCwd);
      }

      if (result.didMutate) {
        persistDb();
        onDbChange?.();
      }

      setHistory((prev) => [...prev, { input: value, output: result.output }]);
      setCommandHistory((prev) => [...prev, value]);
      setHistoryIndex(-1);
    },
    [onClose, onDbChange, cwd, maxFolders],
  );

  const complete = useCallback(() => {
    const parts = input.split(/\s+/);
    if (parts.length === 1 && !input.includes(" ")) {
      const partial = parts[0]!.toLowerCase();
      const match = COMMANDS.find((c) => c.startsWith(partial));
      if (match) {
        setInput(match + " ");
        const el = inputRef.current;
        if (el) {
          const pos = match.length + 1;
          el.setSelectionRange(pos, pos);
        }
      }
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "l":
          e.preventDefault();
          setHistory([]);
          return;
        case "c":
          if (document.getSelection()?.toString()) return;
          e.preventDefault();
          setHistory((prev) => [...prev, { input: input + "^C", output: "" }]);
          setInput("");
          return;
        case "v":
          return;
        case "d":
          e.preventDefault();
          if (input === "") {
            onClose?.();
          }
          return;
      }
    }

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        handleCommand(input);
        setInput("");
        break;
      case "Tab":
        e.preventDefault();
        complete();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (commandHistory.length === 0) return;
        {
          const idx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(idx);
          setInput(commandHistory[idx] ?? "");
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (historyIndex === -1) return;
        if (historyIndex >= commandHistory.length - 1) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          const idx = historyIndex + 1;
          setHistoryIndex(idx);
          setInput(commandHistory[idx] ?? "");
        }
        break;
    }
  };

  return (
    <div
      className="window-content-inner terminal"
      ref={scrollRef}
      role="log"
      aria-label="Terminal output"
      aria-live="polite"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="terminal-output" style={{ userSelect: "text" }}>
        {history.map((entry, i) => (
          <div key={i}>
            {entry.input !== "" && (
              <div>
                <Prompt cwd={cwd} />
                {entry.input}
              </div>
            )}
            {entry.output !== "" && (
              <div style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>{entry.output}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center" }} onClick={() => inputRef.current?.focus()}>
        <Prompt cwd={cwd} />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Terminal input"
          style={{
            background: "transparent",
            border: "none",
            color: "#00ff00",
            fontFamily: '"Share Tech Mono", "Courier New", monospace',
            fontSize: 13,
            outline: "none",
            flex: 1,
            caretColor: "#00ff00",
          }}
        />
      </div>
    </div>
  );
}

export default Terminal;
