import { useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { initDb, persistDb } from "../data/db";
import { findItemsBySectionId, upsertItem } from "../data/models/section";

interface TextEditorProps {
  sectionId: string;
  sectionLabel: string;
  onDbChange?: () => void;
  locked?: boolean;
  preview?: boolean;
}

export interface TextEditorHandle {
  save: () => void;
  selectAll: () => void;
  getText: () => string;
}

function loadItem(sectionId: string): string {
  const db = initDb();
  if (!db) return "";
  const items = findItemsBySectionId(db, sectionId);
  if (items.length === 0) return "";
  const item = items[0]!;
  const lines: string[] = [];
  if (item.title) {
    for (const t of item.title.split(", ")) {
      if (t.trim()) lines.push(`[title: ${t.trim()}]`);
    }
  }
  if (item.description) {
    for (const d of item.description.split("\n")) {
      if (d.trim()) lines.push(`[description: ${d.trim()}]`);
    }
  }
  if (item.tags) {
    let tags: string[];
    try { tags = JSON.parse(item.tags); }
    catch { tags = item.tags.split(",").map((t) => t.trim()).filter(Boolean); }
    if (tags.length > 0) lines.push(`[tags: ${tags.join(", ")}]`);
  }
  if (item.meta_json) {
    try {
      const meta = JSON.parse(item.meta_json) as Record<string, string>;
      for (const [k, v] of Object.entries(meta)) lines.push(`[meta: ${k}=${v}]`);
    } catch { /* ignore */ }
  }
  if (item.body) lines.push("", item.body);
  return lines.join("\n");
}

const DIRECTIVE_RE = /^\[(title|description|tags?|meta):\s*(.*?)\s*\]$/;

function parseDirectives(text: string) {
  const title: string[] = [];
  const description: string[] = [];
  const tags: string[] = [];
  const meta: Record<string, string> = {};
  const bodyLines: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(DIRECTIVE_RE);
    if (!m) { bodyLines.push(line); continue; }
    const d = m[1], v = m[2]!.trim();
    if (d === "title" && v) title.push(v);
    else if (d === "description" && v) description.push(v);
    else if (d === "tag" || d === "tags") {
      for (const t of v.split(",").map((s) => s.trim()).filter(Boolean))
        if (!tags.includes(t)) tags.push(t);
    } else if (d === "meta") {
      const sep = v.includes("=") ? "=" : ":";
      const idx = v.indexOf(sep);
      if (idx > 0) { const k = v.slice(0, idx).trim(), val = v.slice(idx + 1).trim(); if (k) meta[k] = val; }
    }
  }
  return {
    title,
    description,
    tags,
    meta,
    body: bodyLines.join("\n").replace(/^\n+/, ""),
  };
}

function formatBody(body: string): string[] {
  return body.split("\n").reduce((acc: string[], line) => {
    if (line.trim() === "") {
      if (acc.length > 0 && acc[acc.length - 1] !== "") acc.push("");
    } else {
      if (acc.length === 0 || acc[acc.length - 1] === "") acc.push(line);
      else acc[acc.length - 1] += " " + line;
    }
    return acc;
  }, []);
}

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  ({ sectionId, sectionLabel, onDbChange, locked, preview }, ref) => {
    const [text, setText] = useState(() => loadItem(sectionId));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const parsed = useMemo(() => parseDirectives(text), [text]);

    const handleSave = useCallback(() => {
      const p = parsed;
      const db = initDb();
      if (!db) return;
      const items = findItemsBySectionId(db, sectionId);
      if (items.length > 0) {
        const item = items[0]!;
        upsertItem(db, {
          id: item.id, section_id: item.section_id,
          title: p.title.length > 0 ? p.title.join(", ") : item.title,
          body: p.body,
          description: p.description.length > 0 ? p.description.join("\n") : undefined,
          date: item.date ?? undefined,
          tags: p.tags.length > 0 ? p.tags : undefined,
          url: item.url ?? undefined,
          meta: Object.keys(p.meta).length > 0 ? p.meta : undefined,
          sort_order: item.sort_order,
        });
      } else {
        upsertItem(db, {
          id: `file-${sectionId}-${Date.now()}`, section_id: sectionId,
          title: p.title.length > 0 ? p.title.join(", ") : sectionLabel,
          body: p.body,
          description: p.description.length > 0 ? p.description.join("\n") : undefined,
          tags: p.tags.length > 0 ? p.tags : undefined,
          meta: Object.keys(p.meta).length > 0 ? p.meta : undefined,
          sort_order: 0,
        });
      }
      persistDb();
      onDbChange?.();
    }, [sectionId, sectionLabel, parsed, onDbChange]);

    const selectAll = useCallback(() => {
      textareaRef.current?.select();
    }, []);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      selectAll,
      getText: () => text,
    }), [handleSave, selectAll, text]);

    if (locked || preview) {
      const { title, description, tags, meta } = parsed;
      const bodyParagraphs = parsed.body ? formatBody(parsed.body) : [];
      const hasContent = title.length > 0 || description.length > 0 || tags.length > 0 || Object.keys(meta).length > 0 || bodyParagraphs.length > 0;

      return (
        <div className="window-content-inner" style={{ padding: "16px 20px" }}>
          <div className="editor-rendered">
            {title.length > 0 && title.map((t, i) => (
              <h1 key={i} className="editor-rendered-title">{t}</h1>
            ))}
            {description.length > 0 && description.map((d, i) => (
              <p key={i} className="editor-rendered-description">{d}</p>
            ))}
            {tags.length > 0 && (
              <div className="editor-rendered-tags">
                {tags.map((t) => <span key={t} className="skill-tag">{t}</span>)}
              </div>
            )}
            {Object.keys(meta).length > 0 && (
              <div className="editor-rendered-meta">
                {Object.entries(meta).map(([k, v]) => (
                  <div key={k} className="editor-rendered-meta-item">
                    <span className="editor-rendered-meta-key">{k}</span>
                    <span className="editor-rendered-meta-value">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {bodyParagraphs.map((p, i) =>
              p === "" ? <br key={i} /> : <p key={i} className="editor-rendered-paragraph">{p}</p>
            )}
            {!hasContent && <p className="editor-rendered-empty">Empty file</p>}
          </div>
        </div>
      );
    }

    return (
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={`Editing ${sectionLabel}`}
      />
    );
  },
);

export default TextEditor;
