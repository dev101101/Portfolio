const projects = [
  {
    title: "Portfolio OS",
    desc: "A portfolio website styled as a desktop operating system",
    tech: ["React", "TypeScript", "Vite"],
  },
  {
    title: "CLI Tool",
    desc: "A command-line utility for automating workflows",
    tech: ["Rust", "Clap"],
  },
  {
    title: "Web Framework",
    desc: "Lightweight reactive framework for the browser",
    tech: ["TypeScript", "Web APIs"],
  },
  {
    title: "Game Engine",
    desc: "2D game engine built from scratch",
    tech: ["C++", "OpenGL", "SDL"],
  },
];

function Projects() {
  return (
    <div className="window-content-inner">
      <h1>Projects</h1>
      <p className="window-subtitle">Things I've built</p>
      <div className="project-list">
        {projects.map((p) => (
          <div key={p.title} className="project-card">
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <div className="project-tech">
              {p.tech.map((t) => (
                <span key={t} className="tech-tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
