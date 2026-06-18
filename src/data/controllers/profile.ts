import type { Database } from "sql.js";
import { findProfile, upsertProfile } from "../models/profile";

export interface ProfileData {
  avatar: string;
  name: string;
  tagline: string;
  bio: string;
  skills: string[];
  tagline_es?: string;
  bio_es?: string;
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
    tagline_es: row.tagline_es ?? undefined,
    bio_es: row.bio_es ?? undefined,
  };
}

export function saveProfile(db: Database, data: ProfileData) {
  upsertProfile(db, {
    avatar: data.avatar,
    name: data.name,
    tagline: data.tagline,
    bio: data.bio,
    skills: data.skills,
    tagline_es: data.tagline_es,
    bio_es: data.bio_es,
  });
}
