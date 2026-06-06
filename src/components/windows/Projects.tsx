import FileBrowser from "../FileBrowser";

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
    <FileBrowser
      title="Projects"
      items={projects.map((p) => ({
        name: p.title,
        type: "folder" as const,
        detail: (
          <>
            <h2>{p.title}</h2>
            <p>{p.desc}</p>
            <div className="project-tech" style={{ marginTop: 12 }}>
              {p.tech.map((t) => (
                <span key={t} className="tech-tag">{t}</span>
              ))}
            </div>
          </>
        ),
      }))}
    />
  );
}

export default Projects;