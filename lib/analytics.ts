/**
 * Самостоятельная Umami на analytics.igorglushkov.ru.
 * Просмотры и переходы учитывает трекер; здесь — пользовательские события.
 * Адрес трекера также разрешён в CSP (next.config.mjs).
 */

export const UMAMI_SRC = 'https://analytics.igorglushkov.ru/script.js';
export const UMAMI_WEBSITE_ID = 'acc6b504-24d4-493b-a33f-1e14441ddcff';

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

/** Событие для Umami. Трекер мог не загрузиться (блокировщик) — тогда молча ничего */
export function track(name: string, data?: Record<string, string | number>) {
  try {
    window.umami?.track(name, data);
  } catch {
    /* аналитика не должна ломать сайт */
  }
}
