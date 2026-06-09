import type { ReactNode } from "react";
import type { PageItem } from "../data/db";

function renderMarkdown(body: string): ReactNode[] {
  return body.split("\n").map((line, i) => {
    if (line.startsWith("# ")) {
      return <h2 key={i} style={{ margin: "16px 0 8px", fontSize: 16 }}>{line.slice(2)}</h2>;
    }
    if (line.startsWith("## ")) {
      return <h3 key={i} style={{ margin: "14px 0 6px", fontSize: 14, color: "var(--accent)" }}>{line.slice(3)}</h3>;
    }
    if (line.startsWith("- ")) {
      return <li key={i} style={{ marginLeft: 16, listStyle: "disc" }}>{line.slice(2)}</li>;
    }
    if (line.trim() === "") {
      return <br key={i} />;
    }
    return <p key={i} style={{ margin: 0 }}>{line}</p>;
  });
}

interface ContentPageProps {
  item: PageItem;
}

function ContentPage({ item }: ContentPageProps) {
  const parts: ReactNode[] = [];

  if (item.date && item.meta?.event) {
    parts.push(
      <div key="talk-meta" className="talk-meta" style={{ marginBottom: 8 }}>
        <span className="talk-event">{item.meta.event}</span>
        <span className="talk-date" style={{ marginLeft: 12 }}>{item.date}</span>
      </div>
    );
  } else if (item.date) {
    parts.push(
      <time key="date" className="blog-date">{item.date}</time>
    );
  }

  if (item.title) {
    parts.push(<h2 key="title">{item.title}</h2>);
  }

  if (item.meta?.language) {
    parts.push(
      <p key="language" style={{ margin: "4px 0 12px", color: "var(--content-subtitle)", fontSize: "var(--font-size-sm)" }}>
        {item.meta.language}
      </p>
    );
  }

  if (item.body) {
    parts.push(
      <div key="body">
        {renderMarkdown(item.body)}
      </div>
    );
  }

  if (item.tags && item.tags.length > 0) {
    parts.push(
      <div key="tags" className="project-tech" style={{ marginTop: 12 }}>
        {item.tags.map((t) => (
          <span key={t} className="tech-tag">{t}</span>
        ))}
      </div>
    );
  }

  return <>{parts}</>;
}

export default ContentPage;
