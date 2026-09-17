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
};

/** Абзац разобранного текста книги или поста */
export type Para =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'quote'; text: string };

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
  // reason: 'format' — формат нечитаемый (pdf, epub, docx);
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
