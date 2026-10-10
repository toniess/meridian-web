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

/* ------------------------------------------------------------------ */
/* Кодировка файла                                                     */
/* ------------------------------------------------------------------ */

const tryDecode = (bytes: Uint8Array, label: string): string | null => {
  try {
    return new TextDecoder(label, { fatal: true }).decode(bytes);
  } catch {
    // неизвестное имя кодировки или байты, которые в неё не укладываются
    return null;
  }
};

/** Кодировка, объявленная внутри самого файла: пролог FB2/XML или <meta charset> */
function declaredCharset(bytes: Uint8Array): string | null {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  const m =
    head.match(/<\?xml[^>]*encoding=["']([\w-]+)["']/i) ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i);
  return m ? m[1] : null;
}

/**
 * Тело ответа fetch по спецификации всегда читается как UTF-8, а в библиотеке
 * лежат старые txt в windows-1251 — от них на странице оставались крокозябры.
 * Поэтому кодировку определяем сами: BOM, затем строгая проверка на UTF-8
 * (осмысленный русский текст в другой кодировке её почти никогда не проходит),
 * затем объявление внутри файла или заголовок ответа. В конце — windows-1251
 * как самая частая однобайтовая кодировка для русских текстов.
 */
export function decodeTextFile(buf: ArrayBuffer, contentType = ''): string {
  const bytes = new Uint8Array(buf);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);

  // BOM UTF-8 TextDecoder снимает сам
  const utf8 = tryDecode(bytes, 'utf-8');
  if (utf8 !== null) return utf8;

  const label = declaredCharset(bytes) ?? contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  return (label && tryDecode(bytes, label)) || new TextDecoder('windows-1251').decode(bytes);
}

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

/**
 * Заголовок в обычном txt: короткая одиночная строка без завершающей
 * пунктуации. Так выглядят и «Глава третья», и просто «Бортмеханик».
 * Реплики диалога («— Норма пятьдесят») отсекаются по тире в начале.
 */
function looksLikeHeading(line: string): boolean {
  return (
    line.length < 70 &&
    /[A-Za-zА-Яа-яЁё]/.test(line) &&
    !/^[—–-]/.test(line) &&
    (!/[.!?…,:;»"]$/.test(line) ||
      /^(глава|часть|рассказ)\b/i.test(line) ||
      /^[IVXLC]+\.$/.test(line) ||
      /^\d+\.$/.test(line))
  );
}

const nonEmptyLines = (s: string) =>
  s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/**
 * Стихи отличаются от прозы тем, что в них значим сам перенос строки:
 * склеить строфу в абзац — значит сломать стихотворение. Признак — почти
 * каждая строка короткая и начинается с заглавной буквы. Проза так не
 * выглядит даже там, где её жёстко переносят по ширине: её строки длиннее
 * и продолжают предложение со строчной.
 */
function looksLikeVerse(raw: string): boolean {
  const lines = nonEmptyLines(raw);
  if (lines.length < 4) return false;
  const versey = lines.filter((l) => l.length <= 60 && /^[А-ЯЁA-Z—–«"(]/.test(l)).length;
  return versey / lines.length >= 0.7;
}

/** Стихотворение: пустая строка отделяет строфу, внутри строфы переносы сохраняются */
function parseVerse(raw: string): Para[] {
  const out: Para[] = [];
  for (const chunk of raw.split(/\r?\n\s*\r?\n/)) {
    const lines = nonEmptyLines(chunk);
    if (!lines.length) continue;
    if (lines.length === 1 && looksLikeHeading(lines[0])) {
      out.push({ type: 'h', text: lines[0] });
      continue;
    }
    out.push({ type: 'verse', lines });
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
    out.push({
      type: oneLine && looksLikeHeading(block) ? 'h' : 'p',
      text: block.replace(/\s*\r?\n\s*/g, ' '),
    });
  }
  return out;
}

export function parseBook(raw: string, ext: string): Para[] {
  if (ext === 'fb2' || ext === 'xml' || /<FictionBook/i.test(raw.slice(0, 500))) return parseFb2(raw);
  if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html)/i.test(raw.slice(0, 200))) return parseHtml(raw);
  if (ext === 'md' || ext === 'markdown') return parseMarkdown(raw);
  return looksLikeVerse(raw) ? parseVerse(raw) : parsePlain(raw);
}

/* ------------------------------------------------------------------ */
/* Деление на части                                                    */
/* ------------------------------------------------------------------ */

const TARGET_CHARS = 16000;
/** Текст короче этого показывается целиком: делить его на части незачем */
const SPLIT_ABOVE = 24000;
/** Часть короче этого — обрывок (титульный лист, хвост), а не глава */
const MIN_PART = 1500;

const paraLength = (p: Para) =>
  p.type === 'verse' ? p.lines.reduce((n, l) => n + l.length, 0) : p.text.length;

const partLength = (paras: Para[]) => paras.reduce((n, p) => n + paraLength(p), 0);

/**
 * Весь текст одной частью. Если файл начинается заголовком — он и есть
 * название части, а остальные заголовки остаются в тексте подзаголовками.
 */
function wholeText(paras: Para[]): BookPart {
  const first = paras[0];
  return first && first.type === 'h'
    ? { index: 0, title: first.text, paragraphs: paras.slice(1) }
    : { index: 0, title: '', paragraphs: paras };
}

/** title: null — текст до первого заголовка, своего названия у него нет */
type Section = { title: string | null; paragraphs: Para[] };

function byHeadings(paras: Para[]): Section[] {
  const out: Section[] = [];
  let current: Section = { title: null, paragraphs: [] };
  for (const p of paras) {
    if (p.type === 'h') {
      if (current.paragraphs.length) out.push(current);
      current = { title: p.text, paragraphs: [] };
    } else {
      current.paragraphs.push(p);
    }
  }
  if (current.paragraphs.length) out.push(current);
  return out;
}

/**
 * Обрывок приклеивается к следующей части, а последний — к предыдущей.
 * Заголовок той части, что оказалась внутри, остаётся в тексте подзаголовком.
 */
function mergeScraps(sections: Section[]): Section[] {
  const out: Section[] = [];
  let carry: Section | null = null;

  for (const s of sections) {
    const cur: Section = carry
      ? {
          title: carry.title ?? s.title,
          paragraphs: [
            ...carry.paragraphs,
            ...(carry.title !== null && s.title !== null ? [{ type: 'h' as const, text: s.title }] : []),
            ...s.paragraphs,
          ],
        }
      : s;
    carry = null;
    if (partLength(cur.paragraphs) < MIN_PART) carry = cur;
    else out.push(cur);
  }

  if (carry) {
    const last = out.pop();
    if (!last) return [carry];
    out.push({
      title: last.title,
      paragraphs: [
        ...last.paragraphs,
        ...(carry.title !== null ? [{ type: 'h' as const, text: carry.title }] : []),
        ...carry.paragraphs,
      ],
    });
  }
  return out;
}

function bySize(paras: Para[]): Section[] {
  const out: Section[] = [];
  let current: Para[] = [];
  let size = 0;
  for (const p of paras) {
    current.push(p);
    size += paraLength(p);
    if (size >= TARGET_CHARS) {
      out.push({ title: null, paragraphs: current });
      current = [];
      size = 0;
    }
  }
  if (current.length) out.push({ title: null, paragraphs: current });
  return out;
}

/**
 * В API у книги нет глав — есть один файл. Короткий текст (а таких в
 * библиотеке большинство) показывается целиком. Длинный, чтобы не выдавать
 * читателю полотно на сорок экранов, режется на части: по заголовкам, если
 * они есть, иначе по объёму. Короткие строки титульного листа тоже похожи на
 * заголовки, поэтому обрывки приклеиваются к соседним частям.
 */
export function splitIntoParts(paras: Para[]): BookPart[] {
  if (partLength(paras) <= SPLIT_ABOVE) return [wholeText(paras)];

  const headed = paras.filter((p) => p.type === 'h').length >= 2;
  const sections = mergeScraps(headed ? byHeadings(paras) : bySize(paras));
  if (sections.length < 2) return [wholeText(paras)];

  return sections.map((s, i) => ({
    index: i,
    title: s.title ?? (headed ? 'Начало' : `Часть ${i + 1}`),
    paragraphs: s.paragraphs,
  }));
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
