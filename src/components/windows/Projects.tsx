import { useState } from "react";
import { FolderSmallSvg } from "../FolderSvgs";
import { getProjects } from "../../data/db";

function Projects() {
  const [selected, setSelected] = useState<string | null>(null);
  const projects = getProjects();

  if (selected) {
    const project = projects.find((p) => p.name === selected);
    if (!project) return null;

    return (
      <div className="window-content-inner">
        <button className="filebrowser-back" onClick={() => setSelected(null)}>
          ← Back
        </button>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-family)",
            fontSize: "13px",
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          {project.readme}
        </pre>
        <div className="project-tech" style={{ marginTop: 12 }}>
          {project.topics.map((t) => (
            <span key={t} className="tech-tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="window-content-inner">
      <h1>Projects</h1>
      <div className="filebrowser-list">
        {projects.map((project) => (
          <div
            key={project.name}
            className="filebrowser-item"
            onClick={() => setSelected(project.name)}
          >
            <FolderSmallSvg />
            <div>
              <span className="filebrowser-item-name">{project.name}</span>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  margin: 0,
                  color: "var(--content-subtitle)",
                }}
              >
                {project.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
