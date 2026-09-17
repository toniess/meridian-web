import 'server-only';
import type { Attachment, Book, BookContent, Post, Project } from './types';
import { AUDIO_EXT, extFromUrl, parseBook, READABLE_EXT, splitIntoParts } from './content';
import { MOCK_BOOKS, MOCK_BOOK_FILES, MOCK_POSTS, MOCK_PROJECTS } from './mock';

/**
 * Клиент Meridian API 1.0.0.
 *
 * Эндпоинты:
 *   GET /api/library/books/                    → PaginatedBookList
 *   GET /api/library/books/{slug}/             → Book
 *   GET /api/projects/                         → PaginatedProjectList
 *   GET /api/projects/{slug}/                  → Project
 *   GET /api/projects/{project_slug}/posts/    → PaginatedPostList
 *   GET /api/projects/posts/{id}/              → Post
 *
 * Пока API_BASE пуст, всё работает на демо-данных из lib/mock.ts.
 */

const API_BASE = process.env.API_BASE?.replace(/\/$/, '') ?? '';
const REVALIDATE = Number(process.env.REVALIDATE_SECONDS ?? 60);
const FILE_REVALIDATE = Number(process.env.FILE_REVALIDATE_SECONDS ?? 3600);

export const usingMockData = !API_BASE;

/** Какой проект показывается в разделе «Меридиан» */
export const MERIDIAN_SLUG = process.env.MERIDIAN_PROJECT_SLUG ?? 'meridian';

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

async function getJson<T>(url: string, revalidate = REVALIDATE): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // бекенд недоступен — страница покажет пустое состояние, а не упадёт
    return null;
  }
}

/** Проходит по всем страницам пагинации DRF (но не бесконечно) */
async function getAll<T>(path: string, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `${API_BASE}${path}`;

  for (let i = 0; i < maxPages && url; i++) {
    const page: Paginated<T> | null = await getJson<Paginated<T>>(url);
    if (!page) break;
    out.push(...(page.results ?? []));
    url = page.next ? absolute(page.next) : null;
  }
  return out;
}

/**
 * DRF отдаёт в next абсолютный URL. Если бекенд стоит за прокси, он может
 * вернуть внутренний хост — подменяем на наш, чтобы не ходить мимо.
 */
function absolute(next: string): string {
  try {
    const base = new URL(API_BASE);
    const u = new URL(next);
    u.protocol = base.protocol;
    u.host = base.host;
    return u.toString();
  } catch {
    return next;
  }
}

/* ------------------------------------------------------------------ */
/* Сопоставление ответа API с доменной моделью                         */
/* ------------------------------------------------------------------ */

type RawBook = {
  id: number; title: string; slug: string;
  description?: string; cover?: string | null; file?: string | null;
  published_at?: string | null;
};

type RawProject = {
  id: number; title: string; slug: string;
  description?: string; cover?: string | null;
};

type RawPost = {
  id: number; title?: string; body: string;
  published_at?: string | null; attachments: RawAttachment[];
};

type RawAttachment = {
  id: number; type: Attachment['type'];
  file?: string | null; url?: string; caption?: string; order?: number;
};

const mapBook = (r: RawBook): Book => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description ?? '',
  coverUrl: r.cover ?? null,
  fileUrl: r.file ?? null,
  publishedAt: r.published_at ?? null,
});

const mapProject = (r: RawProject): Project => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description ?? '',
  coverUrl: r.cover ?? null,
});

const mapAttachment = (r: RawAttachment): Attachment => ({
  id: r.id,
  type: r.type,
  fileUrl: r.file ?? null,
  url: r.url ?? '',
  caption: r.caption ?? '',
  order: r.order ?? 0,
});

const mapPost = (r: RawPost): Post => ({
  id: r.id,
  title: r.title ?? 'Без заголовка',
  body: r.body ?? '',
  publishedAt: r.published_at ?? null,
  attachments: (r.attachments ?? []).map(mapAttachment).sort((a, b) => a.order - b.order),
});

const byDateDesc = <T extends { publishedAt: string | null }>(a: T, b: T) =>
  (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');

/* ------------------------------------------------------------------ */
/* Библиотека                                                          */
/* ------------------------------------------------------------------ */

export async function listBooks(): Promise<Book[]> {
  if (usingMockData) return [...MOCK_BOOKS].sort(byDateDesc);
  const raw = await getAll<RawBook>('/library/books/');
  return raw.map(mapBook).sort(byDateDesc);
}

export async function getBook(slug: string): Promise<Book | null> {
  if (usingMockData) return MOCK_BOOKS.find((b) => b.slug === slug) ?? null;
  const raw = await getJson<RawBook>(`${API_BASE}/library/books/${slug}/`);
  return raw ? mapBook(raw) : null;
}

/**
 * У книги в API нет ни глав, ни текста — только файл. Здесь он скачивается,
 * разбирается и режется на части. Форматы: txt, md, fb2, html читаются в
 * читалке; аудио уходит в плеер; pdf, epub, docx остаются на скачивание.
 */
export async function getBookContent(book: Book): Promise<BookContent> {
  if (!book.fileUrl) return { kind: 'none' };

  const ext = extFromUrl(book.fileUrl);
  if (AUDIO_EXT.includes(ext)) return { kind: 'audio', src: book.fileUrl };

  if (usingMockData) {
    const raw = MOCK_BOOK_FILES[book.slug];
    if (!raw) return { kind: 'download', src: book.fileUrl, ext: ext || 'pdf', reason: 'format' };
    return { kind: 'text', parts: splitIntoParts(parseBook(raw, ext || 'txt')) };
  }

  if (!READABLE_EXT.includes(ext)) {
    return { kind: 'download', src: book.fileUrl, ext: ext || 'файл', reason: 'format' };
  }

  try {
    const res = await fetch(book.fileUrl, { next: { revalidate: FILE_REVALIDATE } });
    if (!res.ok) return { kind: 'download', src: book.fileUrl, ext, reason: 'unavailable' };
    const raw = await res.text();
    const parts = splitIntoParts(parseBook(raw, ext));
    return parts.length
      ? { kind: 'text', parts }
      : { kind: 'download', src: book.fileUrl, ext, reason: 'unavailable' };
  } catch {
    return { kind: 'download', src: book.fileUrl, ext, reason: 'unavailable' };
  }
}

/* ------------------------------------------------------------------ */
/* Проекты и записи                                                    */
/* ------------------------------------------------------------------ */

export async function listProjects(): Promise<Project[]> {
  if (usingMockData) return MOCK_PROJECTS;
  const raw = await getAll<RawProject>('/projects/');
  return raw.map(mapProject);
}

export async function getProject(slug: string): Promise<Project | null> {
  if (usingMockData) return MOCK_PROJECTS.find((p) => p.slug === slug) ?? null;
  const raw = await getJson<RawProject>(`${API_BASE}/projects/${slug}/`);
  return raw ? mapProject(raw) : null;
}

/**
 * Проект для раздела «Меридиан»: берётся по слагу из MERIDIAN_PROJECT_SLUG,
 * а если такого нет — первый в списке. Так раздел не пустует, даже если
 * слаг в админке назвали иначе.
 */
export async function getMeridianProject(): Promise<Project | null> {
  const direct = await getProject(MERIDIAN_SLUG);
  if (direct) return direct;
  const all = await listProjects();
  return all[0] ?? null;
}

export async function listProjectPosts(projectSlug: string): Promise<Post[]> {
  if (usingMockData) {
    return (MOCK_POSTS[projectSlug] ?? []).map((p) => ({ ...p })).sort(byDateDesc);
  }
  const raw = await getAll<RawPost>(`/projects/${projectSlug}/posts/`);
  return raw.map(mapPost).sort(byDateDesc);
}

export async function getPost(id: number): Promise<Post | null> {
  if (usingMockData) {
    const all = Object.values(MOCK_POSTS).flat();
    return all.find((p) => p.id === id) ?? null;
  }
  const raw = await getJson<RawPost>(`${API_BASE}/projects/posts/${id}/`);
  return raw ? mapPost(raw) : null;
}

/** Соседние записи внутри проекта — для навигации в конце поста */
export async function neighbourPosts(projectSlug: string, id: number) {
  const posts = await listProjectPosts(projectSlug);
  const i = posts.findIndex((p) => p.id === id);
  return { older: posts[i + 1] ?? null, newer: posts[i - 1] ?? null, all: posts };
}
