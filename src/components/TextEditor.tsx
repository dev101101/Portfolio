import { useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { initDb, persistDb } from "../data/db";
import { findItemsBySectionId, upsertItem } from "../data/models/section";

function removeDirective(text: string, directive: string, key?: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const m = line.match(/^\[(title|description|tags?|meta):\s*(.*?)\s*\]$/);
    if (!m) return true;
    if (m[1] !== directive) return true;
    if (directive === "meta" && key) {
      const sep = m[2].includes("=") ? "=" : ":";
      const idx = m[2].indexOf(sep);
      if (idx > 0 && m[2].slice(0, idx).trim() === key) return false;
      return true;
    }
    return false;
  });
  return filtered.join("\n");
}

function replaceDirective(text: string, directive: string, value: string): string {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => l.match(/^\[(title|description|tags?|meta):/));
  if (idx === -1) {
    return `[${directive}: ${value}]\n${text}`;
  }
  const m = lines[idx].match(/^\[(title|description|tags?|meta):/);
  if (m && m[1] === directive) {
    lines[idx] = `[${directive}: ${value}]`;
  } else {
    lines.splice(idx, 0, `[${directive}: ${value}]`);
  }
  return lines.join("\n");
}

interface TextEditorProps {
  sectionId: string;
  sectionLabel: string;
  onDbChange?: () => void;
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
  const item = items[0];
  const lines: string[] = [];
  if (item.title) {
    lines.push(`[title: ${item.title}]`);
  }
  if (item.description) {
    lines.push(`[description: ${item.description}]`);
  }
  if (item.tags) {
    let tags: string[];
    try {
      tags = JSON.parse(item.tags);
    } catch {
      tags = item.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (tags.length > 0) {
      lines.push(`[tags: ${tags.join(", ")}]`);
    }
  }
  if (item.meta_json) {
    try {
      const meta = JSON.parse(item.meta_json) as Record<string, string>;
      for (const [k, v] of Object.entries(meta)) {
        lines.push(`[meta: ${k}=${v}]`);
      }
    } catch { /* ignore */ }
  }
  if (item.body) {
    lines.push("", item.body);
  }
  return lines.join("\n");
}

const DIRECTIVE_RE = /^\[(title|description|tags?|meta):\s*(.*?)\s*\]$/;

function parseDirectives(text: string): {
  title?: string;
  description?: string;
  tags: string[];
  meta: Record<string, string>;
  body: string;
} {
  const title: string[] = [];
  const description: string[] = [];
  const tags: string[] = [];
  const meta: Record<string, string> = {};
  const bodyLines: string[] = [];

  for (const line of text.split("\n")) {
    const m = line.match(DIRECTIVE_RE);
    if (!m) {
      bodyLines.push(line);
      continue;
    }
    const directive = m[1];
    const value = m[2].trim();
    switch (directive) {
      case "title":
        if (value) title.push(value);
        break;
      case "description":
        if (value) description.push(value);
        break;
      case "tag":
      case "tags":
        for (const t of value.split(",").map((s) => s.trim()).filter(Boolean)) {
          if (!tags.includes(t)) tags.push(t);
        }
        break;
      case "meta": {
        const sep = value.includes("=") ? "=" : ":";
        const idx = value.indexOf(sep);
        if (idx > 0) {
          const k = value.slice(0, idx).trim();
          const v = value.slice(idx + 1).trim();
          if (k) meta[k] = v;
        }
        break;
      }
    }
  }

  return {
    title: title.length > 0 ? title.join(", ") : undefined,
    description: description.length > 0 ? description.join("\n") : undefined,
    tags,
    meta,
    body: bodyLines.join("\n").replace(/^\n+/, ""),
  };
}

const LINE_HEIGHT = 20;

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  ({ sectionId, sectionLabel, onDbChange }, ref) => {
    const [text, setText] = useState(() => loadItem(sectionId));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    const parsed = useMemo(() => parseDirectives(text), [text]);

    const lineCount = useMemo(() => text.split("\n").length, [text]);

    const setTextAndSync = useCallback((newText: string) => {
      setText(newText);
    }, []);

    const removeVisual = useCallback((directive: string, key?: string) => {
      setTextAndSync(removeDirective(text, directive, key));
    }, [text]);

    const handleScroll = useCallback(() => {
      const ta = textareaRef.current;
      const gutter = gutterRef.current;
      if (ta && gutter) {
        gutter.scrollTop = ta.scrollTop;
      }
    }, []);

    const handleSave = useCallback(() => {
      const db = initDb();
      if (!db) return;
      const { title, description, tags, meta, body } = parsed;
      const items = findItemsBySectionId(db, sectionId);
      if (items.length > 0) {
        const item = items[0];
        upsertItem(db, {
          id: item.id,
          section_id: item.section_id,
          title: title ?? item.title,
          body,
          description,
          date: item.date ?? undefined,
          tags: tags.length > 0 ? tags : undefined,
          url: item.url ?? undefined,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
          sort_order: item.sort_order,
        });
      } else {
        upsertItem(db, {
          id: `file-${sectionId}-${Date.now()}`,
          section_id: sectionId,
          title: title ?? sectionLabel,
          body,
          description,
          tags: tags.length > 0 ? tags : undefined,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
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

    const { title, description, tags, meta } = parsed;

    return (
      <div className="window-content-inner" style={{ display: "flex", flexDirection: "row", height: "100%" }}>
        <div className="editor-code-pane">
          <div className="editor-gutter" ref={gutterRef} style={{ lineHeight: `${LINE_HEIGHT}px` }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="editor-gutter-line">{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onScroll={handleScroll}
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          />
        </div>
        <div className="editor-preview">
          {title && (
            <div className="editor-preview-section">
              <div className="editor-preview-title">{title}</div>
              <button className="editor-visual-remove" onClick={() => removeVisual("title")}>&times;</button>
            </div>
          )}
          {description && (
            <div className="editor-preview-section">
              <div className="editor-preview-label">description</div>
              <div className="editor-preview-description">{description}</div>
              <button className="editor-visual-remove" onClick={() => removeVisual("description")}>&times;</button>
            </div>
          )}
          {tags.length > 0 && (
            <div className="editor-preview-section">
              <div className="editor-preview-label">tags</div>
              <div className="editor-preview-tags">
                {tags.map((tag) => (
                  <span key={tag} className="skill-tag">
                    {tag}
                    <button className="tag-remove" onClick={() => {
                      const newText = removeDirective(text, "tags");
                      const remaining = tags.filter((t) => t !== tag);
                      setTextAndSync(remaining.length > 0
                        ? replaceDirective(newText, "tags", remaining.join(", "))
                        : newText);
                    }}>&times;</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(meta).length > 0 && (
            <div className="editor-preview-section">
              <div className="editor-preview-label">meta</div>
              {Object.entries(meta).map(([k, v]) => (
                <div key={k} className="editor-preview-meta-item">
                  <span className="editor-preview-meta-key">{k}</span>
                  <span className="editor-preview-meta-value">{v}</span>
                  <button className="editor-visual-remove" onClick={() => removeVisual("meta", k)}>&times;</button>
                </div>
              ))}
            </div>
          )}
          {parsed.body && (
            <div className="editor-preview-body">{parsed.body}</div>
          )}
          {!title && !description && tags.length === 0 && Object.keys(meta).length === 0 && !parsed.body && (
            <div className="editor-preview-empty">Write directives in the editor to see them here</div>
          )}
        </div>
      </div>
    );
  },
);

export default TextEditor;
