function AboutMe() {
  return (
    <div className="window-content-inner">
      <div className="about-header">
        <img
          className="about-avatar"
          src="https://avatars.githubusercontent.com/u/170589535"
          alt="avatar"
        />
        <div>
          <h1>Yaphets</h1>
          <p className="about-subtitle">Software Engineer & Creator</p>
        </div>
      </div>

      <section>
        <h2>About</h2>
        <p>
          Full-stack developer passionate about building beautiful, performant
          web experiences. I love exploring the intersection of design and
          engineering, and I'm always tinkering with new tools and frameworks.
        </p>
      </section>

      <section>
        <h2>Skills</h2>
        <div className="skill-list">
          {[
            "TypeScript",
            "React",
            "Node.js",
            "Rust",
            "Python",
            "Go",
            "PostgreSQL",
            "Docker",
          ].map((skill) => (
            <span key={skill} className="skill-tag">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Contact</h2>
        <p>yaphets@example.com</p>
      </section>
    </div>
  );
}

export default AboutMe;
