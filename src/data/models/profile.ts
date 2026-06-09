import type { Database } from "sql.js";

export interface ProfileRow {
  id: number;
  avatar: string;
  name: string;
  tagline: string;
  bio: string;
  skills: string;
}

export function findProfile(db: Database): ProfileRow | undefined {
  const stmt = db.prepare("SELECT * FROM profile LIMIT 1");
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as ProfileRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export function upsertProfile(
  db: Database,
  profile: { avatar: string; name: string; tagline: string; bio: string; skills: string[] },
) {
  db.run(
    `INSERT INTO profile (id, avatar, name, tagline, bio, skills)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       avatar = excluded.avatar,
       name = excluded.name,
       tagline = excluded.tagline,
       bio = excluded.bio,
       skills = excluded.skills`,
    [profile.avatar, profile.name, profile.tagline, profile.bio, JSON.stringify(profile.skills)],
  );
}

export function seedProfile(db: Database, profile: { avatar: string; name: string; tagline: string; bio: string; skills: string[] }) {
  upsertProfile(db, profile);
}
