import type { ReactNode } from "react";
import type { Profile } from "../data/db";

export function buildProfileDetail(profile: Profile): ReactNode {
  const parts: ReactNode[] = [];

  parts.push(
    <div
      key="avatar"
      className="about-card"
    >
      <img
        className="about-avatar"
        src={profile.avatar}
        alt={profile.name}
      />
      <div className="about-card-text">
        <div className="about-card-header-row">
          <h1 className="about-name-heading">
            {profile.name}
          </h1>
        </div>
        <div className="about-subtitle-row">
          <p className="about-subtitle">
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
        className="about-bio"
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
        <h2 className="skills-heading">Skills</h2>
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
    <div className="about-container">
      {parts}
    </div>
  );
}
