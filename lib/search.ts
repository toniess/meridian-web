/** Регистр и «ё» при поиске не важны: «Тёркин» находится по «теркин» */
export const normSearch = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
