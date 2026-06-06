function AboutMe() {
  return (
    <div className="window-content-inner" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Profile card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: 20,
          background: "var(--window-bg)",
          border: "var(--window-border)",
          boxShadow: "var(--window-shadow)",
        }}
      >
        <img
          className="about-avatar"
          src="https://avatars.githubusercontent.com/u/170589535"
          alt="diego"
          style={{ width: 80, height: 80, flexShrink: 0 }}
        />
        <div>
          <h1 style={{ margin: 0 }}>Hey, I'm Diego!</h1>
          <p className="about-subtitle" style={{ marginTop: 2 }}>
            Software Engineer & Creator
          </p>
        </div>
      </div>

      {/* Bio */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>
          I am a <span className="text-yellow-400">Software Engineer</span> with a solid track record of building scalable and efficient applications since 2022. My core ecosystem is built on{" "}
          <span className="text-emerald-400">Node.js</span>, where I architect robust server-side logic and manage relational databases such as{" "}
          <span className="text-blue-400">MySQL</span> and{" "}
          <span className="text-blue-400">SQLite</span>. On the client side, I have extensive experience using{" "}
          <span className="text-cyan-400">React</span> to develop dynamic and interactive user interfaces.
        </p>

        <p>
          Currently, I am dedicated to deepening my expertise in backend services, optimizing data handling, and refining business logic. I am passionate about solving complex infrastructure challenges and am actively seeking new professional opportunities where I can contribute to high-performance backend systems.
        </p>

        <p>
          Beyond the terminal, I am an enthusiast of{" "}
          <span className="text-pink-400">Pixel Art</span>. This hobby allows me to merge my love for technology with visual creativity, a discipline I occasionally showcase through my social media pieces.
        </p>
      </div>

      {/* Skills */}
      <section>
        <h2 style={{ marginTop: 0 }}>Skills</h2>
        <div className="skill-list">
          {[
            "TypeScript", "React", "Node.js", "Rust",
            "Python", "Go", "PostgreSQL", "Docker",
          ].map((skill) => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AboutMe;
