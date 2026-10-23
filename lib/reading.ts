import { useSyncExternalStore } from 'react';
import { track } from './analytics';

/**
 * Что читатель уже прочитал. Хранится в браузере (localStorage), как и
 * настройки чтения: аккаунтов на сайте нет, а в API держать это негде.
 * На другом устройстве отметок не будет.
 */
export type ReadState = {
  /** Какая доля текста уже показывалась на экране, 0..1 — только растёт */
  seen: number;
  /** Где читатель остановился в последний раз, 0..1 */
  pos: number;
  done: boolean;
  /** Когда открывали в последний раз, мс */
  at: number;
};

export type Reading = Record<string, ReadState>;

const KEY = 'gl:reading';
const EVENT = 'gl:reading';

let cachedRaw: string | null = null;
let cached: Reading = {};

function snapshot(): Reading {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* приватный режим */
  }
  // useSyncExternalStore требует одну и ту же ссылку, пока данные не менялись
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Reading) : {};
    } catch {
      cached = {};
    }
  }
  return cached;
}

function subscribe(cb: () => void) {
  // storage — изменения из других вкладок, EVENT — из этой
  window.addEventListener('storage', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Отметки чтения; null, пока страница не ожила в браузере (на сервере их нет) */
export function useReading(): Reading | null {
  return useSyncExternalStore<Reading | null>(subscribe, snapshot, () => null);
}

export function readingOf(slug: string): ReadState | undefined {
  return snapshot()[slug];
}

export function updateReading(slug: string, patch: Partial<ReadState> | null): ReadState | undefined {
  const all = { ...snapshot() };
  const wasDone = all[slug]?.done ?? false;
  if (patch === null) delete all[slug];
  else {
    const prev: Partial<ReadState> = all[slug] ?? {};
    all[slug] = { seen: 0, pos: 0, done: false, ...prev, ...patch, at: Date.now() };
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    return undefined; // приватный режим — просто не запоминаем
  }
  window.dispatchEvent(new Event(EVENT));
  // и автоматическая отметка, и ручная «Отметить прочитанной»
  if (!wasDone && all[slug]?.done) track('Дочитал', { book: slug });
  return all[slug];
}

export type ReadStatus = 'new' | 'reading' | 'done';

/** Открыл и пролистал хоть немного — уже «читаю» */
export function statusOf(s: ReadState | undefined): ReadStatus {
  if (!s) return 'new';
  if (s.done) return 'done';
  return s.seen > 0.02 || s.pos > 0.02 ? 'reading' : 'new';
}
