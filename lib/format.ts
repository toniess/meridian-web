const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function rusDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 1340 → «22:20» */
export function duration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Склонение: 1 глава, 3 главы, 14 глав */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function videoUrl(provider: string, id: string): string {
  if (provider === 'vk') return `https://vk.com/video${id}`;
  if (provider === 'rutube') return `https://rutube.ru/video/${id}/`;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function embedUrl(provider: string, id: string): string {
  if (provider === 'vk') return `https://vk.com/video_ext.php?oid=${id.split('_')[0]}&id=${id.split('_')[1]}`;
  if (provider === 'rutube') return `https://rutube.ru/play/embed/${id}`;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
