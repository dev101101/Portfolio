const repos = [
  { name: "portfolio", stars: 42, desc: "OS-themed portfolio site", lang: "TypeScript" },
  { name: "cli-tools", stars: 128, desc: "Collection of CLI utilities", lang: "Rust" },
  { name: "web-framework", stars: 89, desc: "Minimalist web framework", lang: "TypeScript" },
  { name: "dotfiles", stars: 56, desc: "Personal dotfiles and config", lang: "Shell" },
];

function GitHub() {
  return (
    <div className="window-content-inner">
      <h1>GitHub</h1>
      <p className="window-subtitle">
        <a href="https://github.com/yaphets" target="_blank" rel="noreferrer">
          github.com/yaphets
        </a>
      </p>
      <div className="repo-list">
        {repos.map((repo) => (
          <div key={repo.name} className="repo-card">
            <div className="repo-header">
              <span className="repo-icon">📘</span>
              <strong>{repo.name}</strong>
              <span className="repo-stars">⭐ {repo.stars}</span>
            </div>
            <p className="repo-desc">{repo.desc}</p>
            <span className="repo-lang">{repo.lang}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GitHub;
