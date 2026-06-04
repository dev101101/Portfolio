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
    <div className="window-content-inner">
      <h1>Speaking</h1>
      <p className="window-subtitle">Talks & conferences</p>
      <div className="talk-list">
        {talks.map((talk) => (
          <div key={talk.title} className="talk-card">
            <div className="talk-meta">
              <span className="talk-event">{talk.event}</span>
              <span className="talk-date">{talk.date}</span>
            </div>
            <h3>{talk.title}</h3>
            <p>{talk.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Speaking;
