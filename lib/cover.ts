const COVER_COLORS = ['#24414F', '#2E3B4A', '#3A4A44', '#4A3E4E', '#42392C', '#2C4650'];

/** Устойчивый цвет типографской обложки для книги без картинки */
export function coverColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return COVER_COLORS[h % COVER_COLORS.length];
}
