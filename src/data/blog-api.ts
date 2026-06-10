import type { PageItem } from "./db";
import { DEVTO_USERNAME } from "./constants";

const API_BASE = "https://dev.to/api";
const CACHE_KEY = "portfolio-blog-cache";
const CACHE_TTL = 60 * 60 * 1000;

interface DevArticleMeta {
  id: number;
  title: string;
  description: string;
  published_at: string;
  url: string;
  tag_list: string[];
  cover_image: string | null;
}

interface DevArticleFull extends DevArticleMeta {
  body_markdown: string;
}

interface CacheData {
  timestamp: number;
  list: DevArticleMeta[];
  articles: Record<number, { body_markdown: string; timestamp: number }>;
}

function getCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCache(list: DevArticleMeta[]) {
  const existing = getCache();
  const data: CacheData = {
    timestamp: Date.now(),
    list,
    articles: existing?.articles ?? {},
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function cacheArticleBody(id: number, body_markdown: string) {
  const existing = getCache();
  if (!existing) return;
  existing.articles[id] = { body_markdown, timestamp: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
}

function isCacheValid(cache: CacheData): boolean {
  return Date.now() - cache.timestamp < CACHE_TTL;
}

export async function fetchBlogList(): Promise<DevArticleMeta[]> {
  const cached = getCache();
  if (cached && isCacheValid(cached) && cached.list.length > 0) {
    return cached.list;
  }

  const res = await fetch(`${API_BASE}/articles?username=${DEVTO_USERNAME}&per_page=100`);
  if (!res.ok) throw new Error(`dev.to API error: ${res.status}`);

  const data: DevArticleMeta[] = await res.json();
  setCache(data);
  return data;
}

export async function fetchBlogArticle(id: number): Promise<DevArticleFull> {
  const cached = getCache();
  const cachedArticle = cached?.articles[id];
  if (cachedArticle && Date.now() - cachedArticle.timestamp < CACHE_TTL) {
    return { ...cached.list.find((a) => a.id === id)!, body_markdown: cachedArticle.body_markdown };
  }

  const res = await fetch(`${API_BASE}/articles/${id}`);
  if (!res.ok) throw new Error(`dev.to article error: ${res.status}`);

  const data: DevArticleFull = await res.json();
  cacheArticleBody(id, data.body_markdown);
  return data;
}

export function mapDevtoToPageItem(article: DevArticleMeta, body?: string): PageItem {
  return {
    title: article.title,
    description: article.description,
    date: new Date(article.published_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    tags: article.tag_list,
    url: article.url,
    body: body ?? undefined,
    meta: article.cover_image ? { coverImage: article.cover_image } : undefined,
  };
}
