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
import { useT } from "../context/LanguageContext";

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
      if (meta?.['itemType'] !== "folder") return { error: `"${parts[i]}" is not a folder` };
    }
    parentId = item.id;
  }
  return { sectionId: section.id, parentItemId: parentId, itemName: parts[parts.length - 1] };
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s); } catch { return null; }
}

function runCommand(input: string, cwd: string, maxFolders: number, t: (key: string, params?: Record<string, string | number>) => string): { output: string; newCwd?: string; didMutate?: boolean } {
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
      return { output: t("terminal.help") };

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
        return { output: secs.map((s) => (s.type === "folder" ? "📁 " : "📄 ") + s.label + "/").join("\n") || t("terminal.empty") };
      }
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: t("terminal.lsError", { path: target, error: r.error }) };
      const items = r.parentItemId === null
        ? findRootItemsBySectionId(db, r.sectionId)
        : findItemsByParentId(db, r.parentItemId);
      if (items.length === 0) return { output: t("terminal.empty") };
      return { output: items.map((i) => {
        const meta = i.meta_json ? safeJsonParse(i.meta_json) : null;
        const icon = meta?.['itemType'] === "folder" ? "📁 " : "📄 ";
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
      if ("error" in r) return { output: t("terminal.cdError", { path: target, error: r.error }) };
      const newPath = "/" + r.sectionId + (r.parentItemId ? "/" + segs.slice(1).join("/") : "");
      return { output: "", newCwd: newPath };
    }

    case "cat": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: t("terminal.usage.cat") };
      const segs = dirParts(target);
      if (segs.length === 1 && cwdSection) {
        const item = findItemByNameAndParent(db, cwdSection.sectionId, segs[0]!, cwdSection.parentItemId);
        if (item) return { output: formatItem(item) };
      }
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: t("terminal.catError", { path: target, error: r.error }) };
      const item = r.itemName
        ? findItemByNameAndParent(db, r.sectionId, r.itemName, r.parentItemId)
        : null;
      if (!item) return { output: t("terminal.error.noFile", { path: target }) };
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
            lines.push((isLast ? "    " : "│   ") + (itLast ? "└── " : "├── ") + it.title + (meta?.['itemType'] === "folder" ? "/" : ""));
          }
        }
      } else {
        const r = resolveSectionPath(db, segs);
        if ("error" in r) return { output: t("terminal.treeError", { path: target, error: r.error }) };
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
      if (!p) return { output: t("terminal.error.noProfile") };
      return { output: `Name: ${p.name}\nTagline: ${p.tagline}\nBio: ${p.bio.slice(0, 200)}${p.bio.length > 200 ? "..." : ""}\nSkills: ${p.skills.join(", ")}` };
    }

    case "sections": {
      const sectionList = findAllSections(db);
      if (sectionList.length === 0) return { output: t("terminal.error.noSections") };
      return { output: formatTable(sectionList.map((s) => ({ id: s.id, label: s.label, type: s.type, order: s.sort_order }))) };
    }

    case "items": {
      const sectionId = parts[1];
      if (!sectionId) return { output: t("terminal.usage.items") };
      const itemList = findItemsBySectionId(db, sectionId);
      if (itemList.length === 0) return { output: t("terminal.error.noItems", { id: sectionId }) };
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
      if (!query) return { output: t("terminal.usage.sql") };
      const isDDL = /^\s*(CREATE|DROP|ALTER|PRAGMA)\b/i.test(query);
      const isMutation = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(query);
      const isDanger = parts.includes("--danger");
      const isForce = parts.includes("--force");
      if (isDDL && !isDanger) {
        return { output: t("terminal.error.ddlBlocked") };
      }
      if (isMutation && !isForce) {
        return { output: t("terminal.error.mutationBlocked", { query: query.slice(0, 120) + (query.length > 120 ? "..." : "") }) };
      }
      try {
        const results = db.exec(query);
        if (results.length === 0) return { output: t("terminal.error.noResults"), didMutate: isMutation || isDDL };
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
        return { output: t("terminal.error.sql", { message: (e as Error).message }) };
      }
    }

    case "add-section": {
      const id = parts[1];
      const label = parts[2];
      const type = parts[3] as "file" | "folder" | "terminal" | undefined;
      if (!id || !label) return { output: t("terminal.usage.addSection") };
      const allSections = findAllSections(db);
      if (allSections.some((s) => s.id === id)) {
        return { output: t("terminal.error.alreadyExists", { id }) };
      }
      if (type === "terminal" && allSections.some((s) => s.type === "terminal")) {
        return { output: t("terminal.error.terminalExists") };
      }
      if (allSections.length + 1 >= maxFolders) {
        return { output: t("terminal.error.desktopFull", { max: maxFolders }) };
      }
      saveSection(db, { id, label, type: type === "folder" ? "folder" : type === "terminal" ? "terminal" : "file" });
      return { output: t("terminal.success.created", { id }), didMutate: true };
    }

    case "add-item": {
      const secId = parts[1];
      const title = parts.slice(2).join(" ");
      if (!secId || !title) return { output: t("terminal.usage.addItem") };
      if (PROTECTED_IDS.includes(secId)) return { output: t("terminal.error.protected", { id: secId }) };
      saveItem(db, {
        id: `manual-${Date.now()}`,
        section_id: secId,
        title,
      });
      return { output: t("terminal.success.itemAdded", { title, id: secId }), didMutate: true };
    }

    case "rm-item": {
      const id = parts[1];
      if (!id) return { output: t("terminal.usage.rmItem") };
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
      if (protectedSection) return { output: t("terminal.error.protectedItem") };
      removeItem(db, id);
      return { output: t("terminal.success.itemDeleted", { id }), didMutate: true };
    }

    case "rm-section": {
      const id = parts[1];
      if (!id) return { output: t("terminal.usage.rmSection") };
      if (PROTECTED_IDS.includes(id)) return { output: t("terminal.error.protectedItem") };
      deleteSection(db, id);
      return { output: t("terminal.success.sectionDeleted", { id }), didMutate: true };
    }

    // --- New nested folder commands ---

    case "mkdir": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: t("terminal.usage.mkdir") };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: t("terminal.usage.mkdir") };
      const r = resolveSectionPath(db, segs.slice(0, -1));
      if ("error" in r) return { output: t("terminal.mkdirError", { error: r.error }) };
      const name = segs[segs.length - 1]!;
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: t("terminal.error.protected", { id: r.sectionId }) };
      const existing = findItemByNameAndParent(db, r.sectionId, name, r.parentItemId);
      if (existing) return { output: t("terminal.error.exists", { path: name }) };
      saveItem(db, {
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section_id: r.sectionId,
        parent_item_id: r.parentItemId ?? undefined,
        title: name,
        meta: { itemType: "folder" },
      });
      return { output: t("terminal.success.folderCreated", { name }), didMutate: true };
    }

    case "touch": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: t("terminal.usage.touch") };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: t("terminal.usage.touch") };
      const r = resolveSectionPath(db, segs.slice(0, -1));
      if ("error" in r) return { output: t("terminal.touchError", { error: r.error }) };
      const name = segs[segs.length - 1]!;
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: t("terminal.error.protected", { id: r.sectionId }) };
      const existing = findItemByNameAndParent(db, r.sectionId, name, r.parentItemId);
      if (existing) return { output: t("terminal.error.exists", { path: name }) };
      saveItem(db, {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        section_id: r.sectionId,
        parent_item_id: r.parentItemId ?? undefined,
        title: name,
      });
      return { output: t("terminal.success.fileCreated", { name }), didMutate: true };
    }

    case "mv": {
      const srcRaw = parts[1];
      const dstRaw = parts[2];
      if (!srcRaw || !dstRaw) return { output: t("terminal.usage.mv") };
      const srcSegs = dirParts(srcRaw);
      const dstSegs = dirParts(dstRaw);
      if (srcSegs.length < 2) return { output: t("terminal.mvSrcError") };
      if (dstSegs.length < 2) return { output: t("terminal.mvDstError") };
      const srcR = resolveSectionPath(db, srcSegs);
      if ("error" in srcR) return { output: t("terminal.mvSrcResolveError", { error: srcR.error }) };
      const dstR = resolveSectionPath(db, dstSegs);
      if ("error" in dstR) return { output: t("terminal.mvDstResolveError", { error: dstR.error }) };
      if (PROTECTED_IDS.includes(srcR.sectionId) || PROTECTED_IDS.includes(dstR.sectionId)) {
        return { output: t("terminal.error.protectedItem") };
      }
      if (!srcR.itemName) return { output: t("terminal.mvSrcNotItem") };
      const srcItem = findItemByNameAndParent(db, srcR.sectionId, srcR.itemName, srcR.parentItemId);
      if (!srcItem) return { output: t("terminal.mvSrcNotFound") };
      saveItem(db, {
        id: srcItem.id,
        section_id: srcItem.section_id,
        parent_item_id: dstR.parentItemId ?? undefined,
        title: srcItem.title,
        body: srcItem.body ?? undefined,
        description: srcItem.description ?? undefined,
        date: srcItem.date ?? undefined,
        tags: srcItem.tags ? (safeJsonParse(srcItem.tags) as unknown as string[]) : undefined,
        url: srcItem.url ?? undefined,
        meta: srcItem.meta_json ? (safeJsonParse(srcItem.meta_json) as Record<string, string>) : undefined,
        sort_order: srcItem.sort_order,
      });
      return { output: t("terminal.success.moved", { name: srcR.itemName }), didMutate: true };
    }

    case "rm": {
      const target = parts.slice(1).join(" ");
      if (!target) return { output: t("terminal.usage.rm") };
      const segs = dirParts(target);
      if (segs.length < 2) return { output: t("terminal.usage.rm") };
      const r = resolveSectionPath(db, segs);
      if ("error" in r) return { output: t("terminal.rmError", { error: r.error }) };
      if (!r.itemName) return { output: t("terminal.rmSectionError") };
      if (PROTECTED_IDS.includes(r.sectionId)) return { output: t("terminal.error.protectedItem") };
      const item = findItemByNameAndParent(db, r.sectionId, r.itemName, r.parentItemId);
      if (!item) return { output: t("terminal.rmNotFound", { name: r.itemName }) };
      const children = findChildrenRecursive(db, item.id);
      for (const child of children) removeItem(db, child.id);
      removeItem(db, item.id);
      return { output: t("terminal.success.rmItems", { name: r.itemName, count: children.length }), didMutate: true };
    }

    case "export": {
      const data = {
        profile: getProfile(db),
        sections: getSections(db),
      };
      return { output: JSON.stringify(data, null, 2) };
    }

    default:
      return { output: t("terminal.error.unknownCmd", { cmd }) };
  }
}

function Prompt({ cwd, t }: { cwd: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <span>
      <span className="terminal-prompt-user">{t("terminal.prompt.user")}@{t("terminal.prompt.host")}</span>
      <span className="terminal-prompt-sep">:</span>
      <span className="terminal-prompt-cwd">{cwd}</span>
      <span className="terminal-prompt-symbol">$ </span>
    </span>
  );
}

interface TerminalProps {
  onClose?: () => void;
  onDbChange?: () => void;
  maxFolders?: number;
}

function Terminal({ onClose, onDbChange, maxFolders = 999 }: TerminalProps) {
  const { t } = useT();
  const [history, setHistory] = useState<HistoryEntry[]>([
    { input: "", output: t("terminal.welcome") },
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
      const result = runCommand(value, cwd, maxFolders, t);

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
      <div className="terminal-output">
        {history.map((entry, i) => (
          <div key={i}>
            {entry.input !== "" && (
              <div>
                <Prompt cwd={cwd} t={t} />
                {entry.input}
              </div>
            )}
            {entry.output !== "" && (
              <div className="terminal-history-output">{entry.output}</div>
            )}
          </div>
        ))}
      </div>
      <div className="terminal-input-line" onClick={() => inputRef.current?.focus()}>
        <Prompt cwd={cwd} t={t} />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Terminal input"
          className="terminal-input-field"
        />
      </div>
    </div>
  );
}

export default Terminal;
