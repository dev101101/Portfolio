import { useState, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { initDb, persistDb } from "../data/db";
import { findItemsBySectionId, upsertItem } from "../data/models/section";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextEditorProps {
  sectionId: string;
  sectionLabel: string;
  onDbChange?: () => void;
  locked?: boolean;
  preview?: boolean;
  itemId?: string;
}

export interface TextEditorHandle {
  save: () => void;
  selectAll: () => void;
  getText: () => string;
}

function hasDirectiveInBody(body: string, type: string): boolean {
  let inCode = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (line.trim() === "" || !line.startsWith("[")) break;
    const m = line.match(/^\[(\w+):/);
    if (m && m[1] === type) return true;
  }
  return false;
}

function loadItem(sectionId: string, itemId?: string): string {
  const db = initDb();
  if (!db) return "";
  const items = findItemsBySectionId(db, sectionId);
  if (items.length === 0) return "";
  const item = itemId ? items.find((i) => i.id === itemId) ?? items[0]! : items[0]!;
  if (!item) return "";
  const body = item.body ?? "";
  const lines: string[] = [];
  if (item.title && !hasDirectiveInBody(body, "title")) {
    for (const t of item.title.split(", ")) {
      if (t.trim()) lines.push(`[title: ${t.trim()}]`);
    }
  }
  if (item.description && !hasDirectiveInBody(body, "description")) {
    for (const d of item.description.split("\n")) {
      if (d.trim()) lines.push(`[description: ${d.trim()}]`);
    }
  }
  if (item.tags && !hasDirectiveInBody(body, "tags") && !hasDirectiveInBody(body, "tag")) {
    let tags: string[];
    try { tags = JSON.parse(item.tags); }
    catch { tags = item.tags.split(",").map((t) => t.trim()).filter(Boolean); }
    if (tags.length > 0) lines.push(`[tags: ${tags.join(", ")}]`);
  }
  if (item.meta_json && !hasDirectiveInBody(body, "meta")) {
    try {
      const meta = JSON.parse(item.meta_json) as Record<string, string>;
      for (const [k, v] of Object.entries(meta)) lines.push(`[meta: ${k}=${v}]`);
    } catch { /* ignore */ }
  }
  if (body) lines.push("", body);
  return lines.join("\n");
}

const DIRECTIVE_RE = /^\[(title|description|tags?|meta):\s*(.*?)\s*\]$/;

function parseDirectives(text: string) {
  const title: string[] = [];
  const description: string[] = [];
  const tags: string[] = [];
  const meta: Record<string, string> = {};
  const bodyLines: string[] = [];
  let inCode = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCode = !inCode;
      bodyLines.push(line);
      continue;
    }
    if (inCode) {
      bodyLines.push(line);
      continue;
    }
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

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  ({ sectionId, sectionLabel, onDbChange, locked, preview, itemId }, ref) => {
    const [text, setText] = useState(() => loadItem(sectionId, itemId));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const parsed = useMemo(() => parseDirectives(text), [text]);

    const handleSave = useCallback(() => {
      const p = parsed;
      const db = initDb();
      if (!db) return;
      const items = findItemsBySectionId(db, sectionId);
      const item = itemId ? items.find((i) => i.id === itemId) : items[0];
      if (item) {
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
    }, [sectionId, sectionLabel, parsed, onDbChange, itemId]);

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
      const hasContent = title.length > 0 || description.length > 0 || tags.length > 0 || Object.keys(meta).length > 0 || !!parsed.body;

      return (
        <div className="window-content-inner editor-preview-inner">
          {!hasContent && <p className="editor-rendered-empty">Empty file</p>}
          {hasContent && (
            <div className="editor-rendered">
              {(title.length > 0 || description.length > 0 || tags.length > 0 || Object.keys(meta).length > 0) && (
                <div className="content-card">
                  <div className="content-card-header">
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
                  </div>
                </div>
              )}
              {parsed.body && (
                <div className="content-body-card editor-body-card">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h2 className="content-heading">{children}</h2>,
                      h2: ({ children }) => <h3 className="content-subheading">{children}</h3>,
                      h3: ({ children }) => <h4 className="content-subsubheading">{children}</h4>,
                      h4: ({ children }) => <h5 className="content-subsubheading">{children}</h5>,
                      h5: ({ children }) => <h6 className="content-subsubheading">{children}</h6>,
                      h6: ({ children }) => <h6 className="content-subsubheading">{children}</h6>,
                      p: ({ children }) => <p className="content-text">{children}</p>,
                      ul: ({ children }) => <ul className="content-list">{children}</ul>,
                      ol: ({ children }) => <ol className="content-list">{children}</ol>,
                      li: ({ children }) => <li className="content-list-item">{children}</li>,
                      pre: ({ children }) => <pre className="content-code-block">{children}</pre>,
                      code: ({ children }) => <code className="content-inline-code">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="content-blockquote">{children}</blockquote>,
                      a: ({ href, children }) => <a className="content-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                      img: ({ src, alt }) => <img className="content-image" src={src} alt={alt ?? ""} loading="lazy" />,
                      hr: () => <hr className="content-hr" />,
                      strong: ({ children }) => <strong className="content-strong">{children}</strong>,
                      em: ({ children }) => <em className="content-em">{children}</em>,
                      del: ({ children }) => <del className="content-del">{children}</del>,
                      table: ({ children }) => <table className="content-table">{children}</table>,
                      th: ({ children }) => <th className="content-th">{children}</th>,
                      td: ({ children }) => <td className="content-td">{children}</td>,
                    }}
                  >
                    {parsed.body}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
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
