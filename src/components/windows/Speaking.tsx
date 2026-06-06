import FileBrowser from "../FileBrowser";

const talks = [
  {
    title: "Building for the Browser",
    event: "JSConf 2026",
    date: "June 2026",
    desc: "Modern strategies for building performant web applications",
  },
  {
    title: "Rust in Production",
    event: "RustConf 2025",
    date: "Sept 2025",
    desc: "Lessons from shipping Rust to production",
  },
  {
    title: "CLI Design Patterns",
    event: "DevToolCon 2025",
    date: "Mar 2025",
    desc: "Designing command-line tools people love to use",
  },
];

function Speaking() {
  return (
    <FileBrowser
      title="Speaking"
      items={talks.map((talk) => ({
        name: `${talk.title} @ ${talk.event}`,
        type: "file" as const,
        detail: (
          <>
            <div className="talk-meta">
              <span className="talk-event">{talk.event}</span>
              <span className="talk-date">{talk.date}</span>
            </div>
            <h2>{talk.title}</h2>
            <p>{talk.desc}</p>
          </>
        ),
      }))}
    />
  );
}

export default Speaking;