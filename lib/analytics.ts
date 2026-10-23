/**
 * Посещаемость считает Umami Cloud: без cookies и localStorage, IP не
 * хранится — поэтому баннер согласия не нужен. Просмотры страниц, в том
 * числе переходы внутри сайта, трекер учитывает сам; здесь — только события.
 *
 * Домены трекера разрешены в CSP (next.config.mjs): скрипт берётся с
 * cloud.umami.is, данные уходят на gateway.umami.is.
 */

export const UMAMI_SRC = 'https://cloud.umami.is/script.js';
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
