import type { ReactNode } from "react";
import type { PageItem } from "../data/db";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Directive {
  type: "title" | "description" | "tags" | "meta";
  value: string;
}

interface CardBlock {
  directives: Directive[];
  body: string;
}

const markdownComponents = {
  h1: ({ children }: { children: ReactNode }) => <h2 className="content-heading">{children}</h2>,
  h2: ({ children }: { children: ReactNode }) => <h3 className="content-subheading">{children}</h3>,
  h3: ({ children }: { children: ReactNode }) => <h4 className="content-subsubheading">{children}</h4>,
  h4: ({ children }: { children: ReactNode }) => <h5 className="content-subsubheading">{children}</h5>,
  h5: ({ children }: { children: ReactNode }) => <h6 className="content-subsubheading">{children}</h6>,
  h6: ({ children }: { children: ReactNode }) => <h6 className="content-subsubheading">{children}</h6>,
  p: ({ children }: { children: ReactNode }) => <p className="content-text">{children}</p>,
  ul: ({ children }: { children: ReactNode }) => <ul className="content-list">{children}</ul>,
  ol: ({ children }: { children: ReactNode }) => <ol className="content-list">{children}</ol>,
  li: ({ children }: { children: ReactNode }) => <li className="content-list-item">{children}</li>,
  pre: ({ children }: { children: ReactNode }) => <pre className="content-code-block">{children}</pre>,
  code: ({ children }: { children: ReactNode }) => <code className="content-inline-code">{children}</code>,
  blockquote: ({ children }: { children: ReactNode }) => <blockquote className="content-blockquote">{children}</blockquote>,
  a: ({ href, children }: { href?: string; children: ReactNode }) => <a className="content-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  img: ({ src, alt }: { src?: string; alt?: string }) => <img className="content-image" src={src} alt={alt ?? ""} loading="lazy" />,
  hr: () => <hr className="content-hr" />,
  strong: ({ children }: { children: ReactNode }) => <strong className="content-strong">{children}</strong>,
  em: ({ children }: { children: ReactNode }) => <em className="content-em">{children}</em>,
  del: ({ children }: { children: ReactNode }) => <del className="content-del">{children}</del>,
  table: ({ children }: { children: ReactNode }) => <div style={{ overflowX: "auto" }}><table className="content-table">{children}</table></div>,
  th: ({ children }: { children: ReactNode }) => <th className="content-th">{children}</th>,
  td: ({ children }: { children: ReactNode }) => <td className="content-td">{children}</td>,
};

function parseDirectives(body: string): { directives: Directive[]; cleanBody: string } {
  const lines = body.split("\n");
  const directives: Directive[] = [];
  const filtered: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) { inCode = !inCode; filtered.push(line); continue; }
    if (!inCode) {
      const m = line.match(/^\[(\w+):\s*(.+)\]$/);
      if (m && ["title", "description", "tags", "meta"].includes(m[1]!)) {
        directives.push({ type: m[1] as Directive["type"], value: m[2]!.trim() });
        continue;
      }
    }
    filtered.push(line);
  }
  return { directives, cleanBody: filtered.join("\n") };
}

function parseCardBlocks(body: string): { cardBlocks: CardBlock[]; remainingBody: string } {
  const lines = body.split("\n");
  const cardBlocks: CardBlock[] = [];
  const outsideLines: string[] = [];
  let inCard = false;
  let inCode = false;
  let curDirectives: Directive[] = [];
  let curBodyLines: string[] = [];

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCode = !inCode;
      (inCard ? curBodyLines : outsideLines).push(line);
      continue;
    }
    if (inCode) {
      (inCard ? curBodyLines : outsideLines).push(line);
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === "[card:]") {
      inCard = true;
      curDirectives = [];
      curBodyLines = [];
      continue;
    }
    if (trimmed === "[/card]") {
      inCard = false;
      cardBlocks.push({
        directives: curDirectives,
        body: curBodyLines.join("\n").replace(/^\n+/, "").replace(/\n+$/, ""),
      });
      continue;
    }
    if (inCard) {
      const m = line.match(/^\[(\w+):\s*(.+)\]$/);
      if (m && ["title", "description", "tags", "meta"].includes(m[1]!)) {
        curDirectives.push({ type: m[1] as Directive["type"], value: m[2]!.trim() });
      } else {
        curBodyLines.push(line);
      }
    } else {
      outsideLines.push(line);
    }
  }

  if (inCard) {
    cardBlocks.push({
      directives: curDirectives,
      body: curBodyLines.join("\n").replace(/^\n+/, "").replace(/\n+$/, ""),
    });
  }

  return { cardBlocks, remainingBody: outsideLines.join("\n") };
}

function renderCardHeader(opts: {
  title?: string;
  description?: string;
  tagsStr?: string;
  metas?: { value: string }[];
}): ReactNode | null {
  const { title, description, tagsStr, metas } = opts;
  if (!title && !description && !tagsStr && !metas?.length) return null;
  return (
    <div className="content-card-header">
      {title && <h2 className="content-page-title">{title}</h2>}
      {description && <p className="content-page-desc">{description}</p>}
      {metas?.map((m, i) => <span key={i} className="content-page-lang">{m.value}</span>)}
      {tagsStr && (
        <div className="content-tags" style={{ marginTop: 2 }}>
          {tagsStr.split(",").map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="skill-tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function DirectiveCard({ directives }: { directives: Directive[] }): ReactNode {
  const title = directives.find((d) => d.type === "title");
  const desc = directives.find((d) => d.type === "description");
  const tags = directives.find((d) => d.type === "tags");
  const metas = directives.filter((d) => d.type === "meta");
  return (
    <div className="content-card">
      {renderCardHeader({
        title: title?.value,
        description: desc?.value,
        tagsStr: tags?.value,
        metas,
      })}
    </div>
  );
}

function renderDirectiveCards(directives: Directive[]): ReactNode[] {
  const cards: ReactNode[] = [];
  let group: Directive[] = [];
  for (const d of directives) {
    if (d.type === "title" && group.length > 0) { cards.push(<DirectiveCard key={group.map(g => g.value).join(",")} directives={group} />); group = [d]; }
    else group.push(d);
  }
  if (group.length > 0) cards.push(<DirectiveCard key={group.map(g => g.value).join(",")} directives={group} />);
  return cards;
}

function renderCardBlocks(blocks: CardBlock[]): ReactNode[] {
  return blocks.map((block, bi) => {
    const title = block.directives.find((d) => d.type === "title");
    const desc = block.directives.find((d) => d.type === "description");
    const tags = block.directives.find((d) => d.type === "tags");
    const metas = block.directives.filter((d) => d.type === "meta");
    const header = renderCardHeader({
      title: title?.value,
      description: desc?.value,
      tagsStr: tags?.value,
      metas,
    });
    return (
      <div className="content-card" key={`card-${bi}`}>
        {header}
        {block.body && (
          <div className="content-body-card" style={header ? { marginTop: 0 } : undefined}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {block.body}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  });
}

function stripTitleHeading(body: string, title: string): string {
  const lines = body.split("\n");
  if (lines.length > 0 && lines[0]!.startsWith("# ") && lines[0]!.slice(2).trim() === title) {
    const rest = lines.slice(1);
    return `## Overview\n\n${rest[0]?.trim() === "" ? rest.slice(1).join("\n") : rest.join("\n")}`;
  }
  return body;
}

interface ContentPageProps {
  item: PageItem;
}

function ContentPage({ item }: ContentPageProps) {
  const rawBody = item.body ?? "";
  const { cardBlocks, remainingBody } = parseCardBlocks(rawBody);
  const { directives, cleanBody } = parseDirectives(remainingBody);
  const body = stripTitleHeading(cleanBody, item.title);
  const directiveCards = renderDirectiveCards(directives);
  const blockCards = renderCardBlocks(cardBlocks);

  return (
    <div className="content-page">
      {item.date && item.meta?.["event"] && (
        <div className="talk-meta" style={{ marginBottom: 4 }}>
          <span className="talk-event">{item.meta["event"]}</span>
          <span className="talk-date" style={{ marginLeft: 12 }}>{item.date}</span>
        </div>
      )}
      {item.date && !item.meta?.["event"] && (
        <time className="blog-date">{item.date}</time>
      )}

      {item.title && (
        <div className="content-card">
          {renderCardHeader({
            title: item.title,
            description: item.description,
            metas: item.meta?.language ? [{ value: item.meta.language }] : undefined,
          })}
        </div>
      )}

      {directiveCards}
      {blockCards}

      {body && (
        <div className="content-body-card">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {body}
          </ReactMarkdown>
        </div>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="content-tags">
          {item.tags.map((t) => <span key={t} className="skill-tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

export default ContentPage;
