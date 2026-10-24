import 'server-only';
import { cache } from 'react';
import type { Attachment, Book, BookContent, Collection, Found, Post, PostHit, Project } from './types';
import { AUDIO_EXT, decodeTextFile, extFromUrl, parseBook, READABLE_EXT, splitIntoParts } from './content';
import { MOCK_BOOKS, MOCK_BOOK_FILES, MOCK_COLLECTIONS, MOCK_POSTS, MOCK_PROJECTS } from './mock';

/**
 * Клиент Meridian API 1.0.0.
 *
 * Эндпоинты:
 *   GET /api/library/books/                    → PaginatedBookList
 *   GET /api/library/books/{slug}/             → Book
 *   GET /api/library/collections/              → PaginatedCollectionList
 *   GET /api/library/collections/{slug}/       → CollectionDetail (со списком книг)
 *   GET /api/library/search/?q=                → { books, collections } с фрагментами
 *   GET /api/projects/                         → PaginatedProjectList
 *   GET /api/projects/{slug}/                  → Project
 *   GET /api/projects/{project_slug}/posts/    → PaginatedPostList
 *   GET /api/projects/posts/{id}/              → Post
 *   GET /api/projects/search/?q=               → найденные записи с фрагментами
 *
 * Пока API_BASE пуст, всё работает на демо-данных из lib/mock.ts.
 */

const API_BASE = process.env.API_BASE?.replace(/\/$/, '') ?? '';
const REVALIDATE = Number(process.env.REVALIDATE_SECONDS ?? 60);
const FILE_REVALIDATE = Number(process.env.FILE_REVALIDATE_SECONDS ?? 3600);

export const usingMockData = !API_BASE;

/** Проект, на который уводит старый адрес /meridian */
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

/**
 * Одна сущность по адресу. null — только если бекенд прямо ответил 404.
 * Сбой сети или 5xx — исключение: иначе страница книги показала бы «не
 * найдено», и ISR закешировал бы эту 404 вместо рабочей страницы. При
 * исключении Next оставляет в кеше прежнюю версию страницы.
 */
async function getEntity<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return (await res.json()) as T;
}

/**
 * Все страницы пагинации DRF (но не бесконечно). Первая страница сообщает
 * count и размер страницы — остальные запрашиваются разом, а не по ссылке
 * next одна за другой: бекенд отдаёт страницу ленты больше секунды.
 */
async function getAll<T>(path: string, maxPages = 20): Promise<T[]> {
  const first = await getJson<Paginated<T>>(`${API_BASE}${path}`);
  if (!first) return [];

  const out = [...(first.results ?? [])];
  if (!first.next || !out.length) return out;

  const total = Math.min(Math.ceil(first.count / out.length), maxPages);
  const rest = await Promise.all(
    Array.from({ length: total - 1 }, (_, i) => {
      const url = new URL(absolute(first.next!));
      url.searchParams.set('page', String(i + 2));
      return getJson<Paginated<T>>(url.toString());
    }),
  );
  for (const page of rest) out.push(...(page?.results ?? []));
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
  // нет у бекенда без сборников
  collection?: { slug: string; title: string } | null;
};

type RawCollection = {
  id: number; title: string; slug: string;
  description?: string; cover?: string | null; file?: string | null;
  published_at?: string | null; books_count?: number;
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
  collection: r.collection ? { slug: r.collection.slug, title: r.collection.title } : null,
});

const mapCollection = (r: RawCollection): Collection => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description ?? '',
  coverUrl: r.cover ?? null,
  fileUrl: r.file ?? null,
  publishedAt: r.published_at ?? null,
  booksCount: r.books_count ?? 0,
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
  const raw = await getEntity<RawBook>(`${API_BASE}/library/books/${slug}/`);
  return raw ? mapBook(raw) : null;
}

/* ------------------------------------------------------------------ */
/* Сборники                                                            */
/* ------------------------------------------------------------------ */

export async function listCollections(): Promise<Collection[]> {
  if (usingMockData) return MOCK_COLLECTIONS;
  // бекенд без сборников ответит 404 — getAll вернёт пустой список
  const raw = await getAll<RawCollection>('/library/collections/');
  return raw.map(mapCollection);
}

export async function getCollection(
  slug: string,
): Promise<{ collection: Collection; books: Book[] } | null> {
  if (usingMockData) return null;
  const raw = await getEntity<RawCollection & { books?: RawBook[] }>(
    `${API_BASE}/library/collections/${slug}/`,
  );
  if (!raw) return null;
  const collection = mapCollection(raw);
  // книги в ответе сборника своего сборника не указывают
  const ref = { slug: collection.slug, title: collection.title };
  const books = (raw.books ?? []).map((b) => ({ ...mapBook(b), collection: ref }));
  return { collection, books };
}

/* ------------------------------------------------------------------ */
/* Поиск по тексту                                                     */
/* ------------------------------------------------------------------ */

/**
 * Полнотекстовый поиск на бекенде, с морфологией: «Сибирь» находит
 * «в Сибири». null — бекенд поиска не умеет или недоступен; тогда
 * остаётся поиск по названиям прямо в браузере.
 */
async function searchJson<T>(path: string, q: string): Promise<T | null> {
  if (usingMockData || !q.trim()) return null;
  try {
    const res = await fetch(`${API_BASE}${path}?q=${encodeURIComponent(q)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Умеет ли бекенд искать: у старой версии API поиска нет (404). Пустой
 * запрос ничего не ищет, только проверяет адрес. Ответ кешируется на час,
 * чтобы страница из-за этой проверки не стала динамической.
 */
export async function canSearch(scope: 'library' | 'projects'): Promise<boolean> {
  if (usingMockData) return false;
  try {
    const res = await fetch(`${API_BASE}/${scope}/search/?q=`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchLibrary(
  q: string,
): Promise<{ books: Found<Book>[]; collections: Found<Collection>[] } | null> {
  type Raw = {
    books: (RawBook & { headline: string })[];
    collections: (RawCollection & { headline: string })[];
  };
  const raw = await searchJson<Raw>('/library/search/', q);
  if (!raw) return null;
  return {
    books: raw.books.map((b) => ({ ...mapBook(b), headline: b.headline })),
    collections: raw.collections.map((c) => ({ ...mapCollection(c), headline: c.headline })),
  };
}

export async function searchPosts(q: string): Promise<PostHit[] | null> {
  type Raw = {
    id: number; title?: string; published_at?: string | null;
    project: { slug: string; title: string }; headline: string;
  }[];
  const raw = await searchJson<Raw>('/projects/search/', q);
  return raw
    ? raw.map((p) => ({
        id: p.id,
        title: p.title || 'Без заголовка',
        publishedAt: p.published_at ?? null,
        project: { slug: p.project.slug, title: p.project.title },
        headline: p.headline,
      }))
    : null;
}

/**
 * У книги в API нет ни глав, ни текста — только файл. Здесь он скачивается,
 * разбирается и режется на части. Форматы: txt, md, fb2, html читаются в
 * читалке; аудио уходит в плеер; pdf листается разворотом; epub и docx
 * остаются на скачивание.
 */
export async function getBookContent(book: Book): Promise<BookContent> {
  if (!book.fileUrl) return { kind: 'none' };

  const ext = extFromUrl(book.fileUrl);
  if (AUDIO_EXT.includes(ext)) return { kind: 'audio', src: book.fileUrl };
  if (ext === 'pdf') return { kind: 'pdf', src: book.fileUrl };

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
    const raw = decodeTextFile(await res.arrayBuffer(), res.headers.get('content-type') ?? '');
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
  const raw = await getEntity<RawProject>(`${API_BASE}/projects/${slug}/`);
  return raw ? mapProject(raw) : null;
}

/**
 * Проект по слагу из MERIDIAN_PROJECT_SLUG, а если такого нет — первый в
 * списке. Нужен только для редиректа со старого адреса /meridian.
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

export type PostContext = {
  post: Post;
  project: Project | null;
  older: Post | null;
  newer: Post | null;
};

/**
 * Запись вместе с проектом и соседями.
 *
 * Проект в API у записи не указан, поэтому ленты проектов перебираются —
 * их немного, а ответы кешируются. Побочная польза: в ленте лежит полная
 * запись (текст и вложения), так что она же работает как запасной вариант,
 * когда /projects/posts/{id}/ отвечает ошибкой. Раньше в этом случае
 * читатель видел «Такой страницы нет».
 */
export const getPostContext = cache(async (id: number): Promise<PostContext | null> => {
  // всё независимое — параллельно: запись, список проектов и все их ленты
  const [fresh, feeds] = await Promise.all([
    getPost(id),
    listProjects().then((projects) =>
      Promise.all(projects.map(async (project) => ({ project, posts: await listProjectPosts(project.slug) }))),
    ),
  ]);

  for (const { project, posts } of feeds) {
    const i = posts.findIndex((p) => p.id === id);
    if (i !== -1) {
      return {
        post: fresh ?? posts[i],
        project,
        older: posts[i + 1] ?? null,
        newer: posts[i - 1] ?? null,
      };
    }
  }

  return fresh ? { post: fresh, project: null, older: null, newer: null } : null;
});
