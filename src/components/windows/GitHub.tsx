import FileBrowser from "../FileBrowser";

const repos = [
  { name: "portfolio", stars: 42, desc: "OS-themed portfolio site", lang: "TypeScript" },
  { name: "cli-tools", stars: 128, desc: "Collection of CLI utilities", lang: "Rust" },
  { name: "web-framework", stars: 89, desc: "Minimalist web framework", lang: "TypeScript" },
  { name: "dotfiles", stars: 56, desc: "Personal dotfiles and config", lang: "Shell" },
];

function GitHub() {
  return (
    <FileBrowser
      title="GitHub"
      items={repos.map((repo) => ({
        name: repo.name,
        type: "folder" as const,
        detail: (
          <>
            <div className="repo-header">
              <strong>{repo.name}</strong>
              <span className="repo-stars">⭐ {repo.stars}</span>
            </div>
            <p>{repo.desc}</p>
            <span className="repo-lang">{repo.lang}</span>
          </>
        ),
      }))}
    />
  );
}

export default GitHub;