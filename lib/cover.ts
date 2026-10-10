/**
 * Стили рисованной обложки для книги без картинки. Каждая книга получает
 * один из включённых стилей по своему slug — обложка у неё постоянная.
 *
 * Чтобы отключить стиль, уберите его из списка: книги этого стиля
 * распределятся по оставшимся. Пустым список оставлять нельзя.
 */
export const COVER_STYLES: CoverStyle[] = [
  // 'pattern', // генеративный узор: волны, круги, штриховка или точки
  // 'letter', // крупная буквица на ярком фоне
  'cloth', // тканевый переплёт с золотым тиснением
];

export type CoverStyle = 'pattern' | 'letter' | 'cloth';

export const COVER_AUTHOR = 'Игорь Глушков';

export function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Последовательность псевдослучайных чисел 0..1, своя для каждой книги */
export function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

export function coverStyle(slug: string): CoverStyle {
  // своя соль, чтобы выбор стиля не зависел от цвета и узора внутри стиля
  return COVER_STYLES[hash(`style:${slug}`) % COVER_STYLES.length];
}

const SIZES = ['xl', 'l', 'm', 's'] as const;

/**
 * Кегль названия: короткое — крупно, длинное — мельче. Отдельно смотрим
 * на самое длинное слово: «Транссибирский» не переносится, и крупным
 * кеглем оно вылезло бы за край обложки.
 */
export function titleSize(title: string): (typeof SIZES)[number] {
  const n = title.length;
  const byLength = n <= 9 ? 0 : n <= 16 ? 1 : n <= 26 ? 2 : 3;
  // переносим только по словам, поэтому кегль должен вместить самое длинное;
  // заглавные шире строчных — «ТЕЛЕГРАММА» считаем длиннее «телеграммы»
  const width = (w: string) =>
    [...w].reduce((n, ch, i) => n + (i > 0 && /[А-ЯЁA-Z]/.test(ch) ? 1.25 : 1), 0);
  const word = Math.max(...title.split(/[\s-]+/).map(width));
  const byWord = word <= 8 ? 0 : word <= 10 ? 1 : word <= 13 ? 2 : 3;
  return SIZES[Math.max(byLength, byWord)];
}
