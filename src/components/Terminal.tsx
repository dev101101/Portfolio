import { useState, useRef, useCallback, useEffect } from "react";
import { initDb, persistDb } from "../data/db";
import { getProfile } from "../data/controllers/profile";
import { getSections, saveSection, saveItem, removeItem } from "../data/controllers/section";
import { findAllSections, findItemsBySectionId, deleteSection } from "../data/models/section";
import { PROTECTED_IDS } from "../data/constants";

const COMMANDS = [
  "help", "ls", "cd", "pwd", "cat", "profile", "sections", "items", "sql",
  "add-section", "add-item", "rm-item", "rm-section",
  "export", "clear", "exit",
];

interface HistoryEntry {
  input: string;
  output: string;
}

function formatItem(item: { body: string | null; meta_json: string | null; tags: string | null; description: string | null; url: string | null; date: string | null }): string {
  const parts: string[] = [];
  if (item.body) parts.push(item.body as string);
  if (item.meta_json) {
    try {
      const meta = JSON.parse(item.meta_json as string);
      const lines = Object.entries(meta).map(([k, v]) => `  ${k}: ${v}`);
      parts.push(`[meta]\n${lines.join("\n")}`);
    } catch { /* ignore */ }
  }
  if (item.tags) {
    try {
      const tags = JSON.parse(item.tags as string);
      if (Array.isArray(tags) && tags.length) parts.push(`[tags] ${tags.join(", ")}`);
    } catch { /* ignore */ }
  }
  if (item.description) parts.push(`[description] ${item.description}`);
  if (item.url) parts.push(`[url] ${item.url}`);
  if (item.date) parts.push(`[date] ${item.date}`);
  return parts.join("\n\n") || "(no content)";
}

function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "No rows found.";
  const cols = Object.keys(rows[0]);
  const colWidths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const sep = colWidths.map((w) => "-".repeat(w + 2)).join("+");
  const header = cols.map((c, i) => c.padEnd(colWidths[i])).join(" | ");
  const lines = rows.map((r) =>
    cols.map((c, i) => String(r[c] ?? "").padEnd(colWidths[i])).join(" | "),
  );
  return ` ${sep}\n| ${header} |\n ${sep}\n${lines.map((l) => `| ${l} |`).join("\n")}\n ${sep}`;
}

function runCommand(input: string, cwd: string, maxFolders: number): { output: string; newCwd?: string; didMutate?: boolean } {
  const db = initDb();
  if (!db) return { output: "Database is initializing. Please wait..." };
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case "help":
      return { output: [
        "Available commands:",
        ...COMMANDS.map((c) => `  ${c}`),
        "",
        "  Ctrl+L  clear screen",
        "  Ctrl+C  cancel current line",
        "  Ctrl+D  exit terminal",
        "  Tab     autocomplete commands",
      ].join("\n") };

    case "clear":
      return { output: "__CLEAR__" };

    case "exit":
      return { output: "__EXIT__" };

    case "pwd":
      return { output: cwd };

    case "ls": {
      const sections = findAllSections(db);
      if (cwd === "/") {
        const dirs = sections.map((s) => s.label + "/");
        return { output: dirs.join("\n") || "(empty)" };
      }
      const section = sections.find((s) => cwd === "/" + s.id || cwd === "/" + s.label);
      if (!section) return { output: `ls: ${cwd}: No such directory` };
      const items = findItemsBySectionId(db, section.id);
      if (items.length === 0) return { output: "(empty)" };
      return { output: items.map((i) => i.title + (i.url ? " -> " + i.url : "")).join("\n") };
    }

    case "cd": {
      const target = parts.slice(1).join(" ").replace(/^\/+/, "");
      if (!target || target === "/" || target === "~") return { output: "", newCwd: "/" };
      if (target === "..") {
        const parent = cwd.split("/").slice(0, -1).join("/") || "/";
        return { output: "", newCwd: parent };
      }
      const sections = findAllSections(db);
      const match = sections.find((s) => s.id === target || s.label === target);
      if (match) return { output: "", newCwd: "/" + match.id };
      return { output: `cd: ${target}: No such directory` };
    }

    case "cat": {
      const name = parts.slice(1).join(" ");
      if (!name) return { output: "Usage: cat <title>" };
      const sections = findAllSections(db);
      const currentSection = sections.find((s) => cwd === "/" + s.id || cwd === "/" + s.label);
      if (currentSection) {
        const items = findItemsBySectionId(db, currentSection.id);
        const item = items.find((i) => i.title === name);
        if (item) return { output: formatItem(item as Parameters<typeof formatItem>[0]) };
      }
      const allItems = sections.flatMap((s) =>
        findItemsBySectionId(db, s.id).map((i) => ({ ...i, _section: s.label })),
      );
      const match = allItems.find((i) => i.title === name);
      if (match) return { output: formatItem(match as Parameters<typeof formatItem>[0]) };
      return { output: `cat: ${name}: No such file` };
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
          type: i.url ? "link" : "doc",
        })),
      ) };
    }

    case "sql": {
      const query = trimmed.slice(4).trim();
      if (!query) return { output: "Usage: sql <query>" };
      try {
        const results = db.exec(query);
        const isMutation = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(query);
        if (results.length === 0) return { output: "Query executed (no results).", didMutate: isMutation };
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
      const partial = parts[0].toLowerCase();
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
          setInput(commandHistory[idx]);
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
          setInput(commandHistory[idx]);
        }
        break;
    }
  };

  return (
    <div
      className="window-content-inner terminal"
      ref={scrollRef}
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
