import { useState, useCallback, useRef } from "react";
import { initDb, persistDb } from "../data/db";
import { findItemsBySectionId, upsertItem } from "../data/models/section";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FileNavbar from "./FileNavbar";
import { useT } from "../context/LanguageContext";

interface ItemEditorProps {
  sectionId: string;
  itemName: string;
}

function ItemEditor({ sectionId, itemName }: ItemEditorProps) {
  const { t } = useT();
  const db = initDb();
  const item = db
    ? findItemsBySectionId(db, sectionId).find((i) => i.title === itemName)
    : undefined;
  const initialBody = item?.body ?? "";

  const [text, setText] = useState(initialBody);
  const [preview, setPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = useCallback(() => {
    const db2 = initDb();
    if (!db2) return;
    const items2 = findItemsBySectionId(db2, sectionId);
    const item2 = items2.find((i) => i.title === itemName);
    if (!item2) return;
    upsertItem(db2, {
      id: item2.id,
      section_id: sectionId,
      title: item2.title,
      body: text,
      description: item2.description ?? undefined,
      date: item2.date ?? undefined,
      tags: item2.tags ? JSON.parse(item2.tags) : undefined,
      url: item2.url ?? undefined,
      meta: item2.meta_json ? JSON.parse(item2.meta_json) : undefined,
      sort_order: item2.sort_order,
    });
    persistDb();
  }, [sectionId, itemName, text]);

  const handleSelectAll = useCallback(() => {
    textareaRef.current?.select();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  if (!db) {
    return (
      <div className="window-content-inner editor-loading-inner">
        <p>{t("editor.loading")}</p>
      </div>
    );
  }

  return (
    <div
      className="editor-layout"
      onKeyDown={handleKeyDown}
    >
      <div className="window-navbar">
        <FileNavbar
          onSave={handleSave}
          onPreview={() => setPreview((p) => !p)}
          previewing={preview}
          onSelectAll={handleSelectAll}
        />
      </div>
      <div className="editor-content">
        {preview ? (
          text ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h2 className="content-heading">{children}</h2>,
                h2: ({ children }) => <h3 className="content-subheading">{children}</h3>,
                p: ({ children }) => <p className="content-text">{children}</p>,
                li: ({ children }) => <li className="content-list-item">{children}</li>,
              }}
            >
              {text}
            </ReactMarkdown>
          ) : (
            <p className="editor-rendered-empty">
              {t("editor.emptyEditHint")}
            </p>
          )
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
            placeholder={t("editor.placeholder")}
          />
        )}
      </div>
    </div>
  );
}

export default ItemEditor;
