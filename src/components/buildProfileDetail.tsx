import type { ReactNode } from "react";
import type { Profile } from "../data/db";

export function buildProfileDetail(profile: Profile): ReactNode {
  const parts: ReactNode[] = [];

  parts.push(
    <div
      key="avatar"
      className="about-card"
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
        src={profile.avatar}
        alt={profile.name}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <h1
            style={{
              margin: 0,
              letterSpacing: 0,
              fontSize: "auto",
            }}
          >
            {profile.name}
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
          }}
        >
          <p className="about-subtitle" style={{ margin: 0 }}>
            {profile.tagline}
          </p>
          <a
            href="/resume.pdf"
            download
            className="about-dl-btn"
            aria-label="Download resume as PDF"
          >
            ⬇ RESUME
          </a>
        </div>
      </div>
    </div>,
  );

  if (profile.bio) {
    parts.push(
      <div
        key="bio"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {profile.bio.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>,
    );
  }

  if (profile.skills.length > 0) {
    parts.push(
      <section key="skills">
        <h2 style={{ marginTop: 0 }}>Skills</h2>
        <div className="skill-list">
          {profile.skills.map((skill) => (
            <span key={skill} className="skill-tag">
              {skill}
            </span>
          ))}
        </div>
      </section>,
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {parts}
    </div>
  );
}
