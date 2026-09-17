import type { BookPart, Para } from './types';

/* ------------------------------------------------------------------ */
/* Разбор файла книги                                                  */
/* ------------------------------------------------------------------ */

export function extFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : '';
}

export const AUDIO_EXT = ['mp3', 'm4a', 'm4b', 'ogg', 'oga', 'opus', 'wav', 'aac', 'flac'];
export const READABLE_EXT = ['txt', 'md', 'markdown', 'fb2', 'html', 'htm', 'xml'];

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const strip = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** FB2 — самый вероятный формат для русской прозы */
function parseFb2(raw: string): Para[] {
  // отбрасываем <binary> (картинки в base64) и описание
  const body = raw.replace(/<binary[\s\S]*?<\/binary>/gi, '');
  const match = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = match ? match[1] : body;

  const out: Para[] = [];
  const re = /<(title|subtitle|p|cite)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(inner)) !== null) {
    const tag = m[1].toLowerCase();
    const text = strip(m[2]);
    if (!text) continue;
    if (tag === 'title' || tag === 'subtitle') out.push({ type: 'h', text });
    else if (tag === 'cite') out.push({ type: 'quote', text });
    else out.push({ type: 'p', text });
  }
  return out;
}

function parseHtml(raw: string): Para[] {
  const body = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const out: Para[] = [];
  const re = /<(h[1-4]|p|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const text = strip(m[2]);
    if (!text) continue;
    if (tag.startsWith('h')) out.push({ type: 'h', text });
    else if (tag === 'blockquote') out.push({ type: 'quote', text });
    else out.push({ type: 'p', text });
  }
  return out.length ? out : parsePlain(strip(body));
}

function parseMarkdown(raw: string): Para[] {
  const out: Para[] = [];
  for (const chunk of raw.split(/\r?\n\s*\r?\n/)) {
    const block = chunk.trim();
    if (!block) continue;
    const h = block.match(/^#{1,4}\s+(.*)$/);
    if (h) { out.push({ type: 'h', text: h[1].trim() }); continue; }
    if (block.startsWith('>')) {
      out.push({ type: 'quote', text: block.replace(/^>\s?/gm, '').replace(/\s+/g, ' ').trim() });
      continue;
    }
    out.push({ type: 'p', text: block.replace(/\s*\r?\n\s*/g, ' ') });
  }
  return out;
}

/** Обычный txt: заголовками считаем строки вида «Глава 3», «ЧАСТЬ ВТОРАЯ» и капслок */
function parsePlain(raw: string): Para[] {
  const out: Para[] = [];
  for (const chunk of raw.split(/\r?\n\s*\r?\n/)) {
    const block = chunk.trim();
    if (!block) continue;
    const oneLine = !block.includes('\n');
    // Заголовок в обычном txt: короткая одиночная строка без завершающей
    // пунктуации. Так выглядят и «Глава третья», и просто «Бортмеханик».
    // Реплики диалога («— Норма пятьдесят») отсекаются по тире в начале.
    const looksLikeHeading =
      oneLine &&
      block.length < 70 &&
      /[A-Za-zА-Яа-яЁё]/.test(block) &&
      !/^[—–-]/.test(block) &&
      (!/[.!?…,:;»"]$/.test(block) ||
        /^(глава|часть|рассказ)\b/i.test(block) ||
        /^[IVXLC]+\.$/.test(block) ||
        /^\d+\.$/.test(block));
    out.push({ type: looksLikeHeading ? 'h' : 'p', text: block.replace(/\s*\r?\n\s*/g, ' ') });
  }
  return out;
}

export function parseBook(raw: string, ext: string): Para[] {
  if (ext === 'fb2' || ext === 'xml' || /<FictionBook/i.test(raw.slice(0, 500))) return parseFb2(raw);
  if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html)/i.test(raw.slice(0, 200))) return parseHtml(raw);
  if (ext === 'md' || ext === 'markdown') return parseMarkdown(raw);
  return parsePlain(raw);
}

/* ------------------------------------------------------------------ */
/* Деление на части                                                    */
/* ------------------------------------------------------------------ */

const TARGET_CHARS = 16000;

/**
 * В API у книги нет глав — есть один файл. Чтобы читалка не выдавала
 * читателю полотно на сорок экранов, текст режется на части: по
 * заголовкам, если они есть, иначе по объёму.
 */
export function splitIntoParts(paras: Para[]): BookPart[] {
  const headings = paras.filter((p) => p.type === 'h').length;

  if (headings >= 2) {
    const parts: BookPart[] = [];
    let current: Para[] = [];
    let title = 'Начало';

    const push = () => {
      if (current.length) {
        parts.push({ index: parts.length, title, paragraphs: current });
      }
    };

    for (const p of paras) {
      if (p.type === 'h') {
        push();
        current = [];
        title = p.text;
      } else {
        current.push(p);
      }
    }
    push();
    return parts.length ? parts : [{ index: 0, title: 'Текст', paragraphs: paras }];
  }

  const parts: BookPart[] = [];
  let current: Para[] = [];
  let size = 0;

  for (const p of paras) {
    current.push(p);
    size += p.text.length;
    if (size >= TARGET_CHARS) {
      parts.push({ index: parts.length, title: `Часть ${parts.length + 1}`, paragraphs: current });
      current = [];
      size = 0;
    }
  }
  if (current.length) {
    parts.push({ index: parts.length, title: `Часть ${parts.length + 1}`, paragraphs: current });
  }
  return parts.length ? parts : [{ index: 0, title: 'Текст', paragraphs: paras }];
}

/* ------------------------------------------------------------------ */
/* Тело поста                                                          */
/* ------------------------------------------------------------------ */

/** Поле body приходит строкой. Понимаем лёгкий markdown и переносы строк. */
export function parseBody(body: string): Para[] {
  if (!body) return [];
  if (/<(p|div|h[1-4]|br)\b/i.test(body)) return parseHtml(body);
  return parseMarkdown(body);
}

/** Короткая выжимка для ленты: в API нет поля excerpt */
export function excerptFrom(body: string, limit = 180): string {
  const first = parseBody(body).find((p) => p.type === 'p')?.text ?? '';
  if (first.length <= limit) return first;
  const cut = first.slice(0, limit);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/* ------------------------------------------------------------------ */
/* Видео по ссылке                                                     */
/* ------------------------------------------------------------------ */

export function videoEmbed(url: string): { src: string; provider: string } | null {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return { src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`, provider: 'YouTube' };
    }
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') ?? u.pathname.split('/').pop();
      return id ? { src: `https://www.youtube-nocookie.com/embed/${id}`, provider: 'YouTube' } : null;
    }
    if (host.endsWith('rutube.ru')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? { src: `https://rutube.ru/play/embed/${id}`, provider: 'Rutube' } : null;
    }
    if (host.endsWith('vk.com') || host.endsWith('vkvideo.ru')) {
      const m = u.pathname.match(/video(-?\d+)_(\d+)/) ?? url.match(/video(-?\d+)_(\d+)/);
      if (m) return { src: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}`, provider: 'VK Видео' };
      return null;
    }
    if (host.endsWith('dzen.ru') || host.endsWith('zen.yandex.ru')) {
      return { src: url.replace('/video/watch/', '/embed/'), provider: 'Дзен' };
    }
    return null;
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
}
