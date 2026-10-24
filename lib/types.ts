/**
 * Доменная модель. Соответствует Meridian API 1.0.0
 * (см. /api/schema/). Отличия от API минимальны и сводятся к
 * переименованию полей в camelCase и разбору содержимого.
 */

export type Book = {
  id: number;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  /** Файл книги целиком: txt, md, fb2, html, pdf, epub, docx или аудио */
  fileUrl: string | null;
  publishedAt: string | null;
  /** Сборник, в который входит рассказ; null — самостоятельное произведение */
  collection: { slug: string; title: string } | null;
};

/** Сборник — издание из рассказов. Устроен как книга: обложка, описание, файл издания целиком */
export type Collection = {
  id: number;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  /** Издание целиком, обычно PDF; может отсутствовать */
  fileUrl: string | null;
  publishedAt: string | null;
  booksCount: number;
};

/** Найденное поиском: headline — фрагмент текста, совпадения в <mark></mark> */
export type Found<T> = T & { headline: string };

export type PostHit = {
  id: number;
  title: string;
  publishedAt: string | null;
  project: { slug: string; title: string };
  headline: string;
};

/** Абзац разобранного текста книги или поста */
export type Para =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'quote'; text: string }
  // строфа стихотворения: переносы строк здесь значимы и сохраняются
  | { type: 'verse'; lines: string[] };

/** Книга не делится на главы в API, поэтому части вычисляются из текста */
export type BookPart = {
  index: number;
  title: string;
  paragraphs: Para[];
};

/** Что удалось сделать с файлом книги */
export type BookContent =
  | { kind: 'text'; parts: BookPart[] }
  | { kind: 'audio'; src: string }
  // листается в читалке-развороте
  | { kind: 'pdf'; src: string }
  // reason: 'format' — формат нечитаемый (epub, docx);
  //         'unavailable' — формат читаемый, но файл не скачался
  | { kind: 'download'; src: string; ext: string; reason: 'format' | 'unavailable' }
  | { kind: 'none' };

export type Project = {
  id: number;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
};

export type Post = {
  id: number;
  title: string;
  body: string;
  publishedAt: string | null;
  attachments: Attachment[];
};

export type AttachmentType = 'image' | 'video_file' | 'video_link' | 'document' | 'link';

export type Attachment = {
  id: number;
  type: AttachmentType;
  /** Загруженный на бекенд файл */
  fileUrl: string | null;
  /** Внешняя ссылка */
  url: string;
  caption: string;
  order: number;
};
