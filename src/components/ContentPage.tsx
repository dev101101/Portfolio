import type { PageItem } from "../data/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function stripTitleHeading(body: string, title: string): string {
  const lines = body.split("\n");
  if (lines.length > 0 && lines[0]!.startsWith("# ") && lines[0]!.slice(2).trim() === title) {
    const rest = lines.slice(1);
    if (rest.length > 0 && rest[0]!.trim() === "") {
      return `## Overview\n\n${rest.slice(1).join("\n")}`;
    }
    return `## Overview\n\n${rest.join("\n")}`;
  }
  return body;
}

interface ContentPageProps {
  item: PageItem;
}

function ContentPage({ item }: ContentPageProps) {
  const body = item.body ? stripTitleHeading(item.body, item.title) : "";

  return (
    <div className="content-page" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Meta header: event + date or just date */}
      {item.date && item.meta?.["event"] && (
        <div className="talk-meta" style={{ marginBottom: 4 }}>
          <span className="talk-event">{item.meta["event"]}</span>
          <span className="talk-date" style={{ marginLeft: 12 }}>{item.date}</span>
        </div>
      )}
      {item.date && !item.meta?.["event"] && (
        <time className="blog-date">{item.date}</time>
      )}

      {/* Title card */}
      {item.title && (
        <div className="content-title-card">
          <h2 className="content-page-title">{item.title}</h2>
          {item.description && (
            <p className="content-page-desc">{item.description}</p>
          )}
          {item.meta?.["language"] && (
            <span className="content-page-lang">{item.meta["language"]}</span>
          )}
        </div>
      )}

      {/* Body */}
      {body && (
        <div className="content-body-card">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className="content-heading">{children}</h2>,
              h2: ({ children }) => <h3 className="content-subheading">{children}</h3>,
              p: ({ children }) => <p className="content-text">{children}</p>,
              li: ({ children }) => <li className="content-list-item">{children}</li>,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="content-tags">
          {item.tags.map((t) => (
            <span key={t} className="skill-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContentPage;
