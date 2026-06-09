import type { Database } from "sql.js";
import { findProfile, upsertProfile } from "../models/profile";

export interface ProfileData {
  avatar: string;
  name: string;
  tagline: string;
  bio: string;
  skills: string[];
}

export function getProfile(db: Database): ProfileData | undefined {
  const row = findProfile(db);
  if (!row) return undefined;
  return {
    avatar: row.avatar,
    name: row.name,
    tagline: row.tagline,
    bio: row.bio,
    skills: JSON.parse(row.skills),
  };
}

export function saveProfile(db: Database, data: ProfileData) {
  upsertProfile(db, data);
}
