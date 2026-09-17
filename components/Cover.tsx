import { coverColor } from '@/lib/cover';
import type { Book } from '@/lib/types';

/**
 * Обложка книги. Если картинки нет — рисуется типографская:
 * так книга без загруженной обложки выглядит решением, а не пропуском.
 */
export default function Cover({ book }: { book: Book }) {
  if (book.coverUrl) {
    return (
      <div className="cover cover-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={book.coverUrl} alt={`Обложка книги «${book.title}»`} />
      </div>
    );
  }

  const year = book.publishedAt ? new Date(book.publishedAt).getFullYear() : null;

  return (
    <div className="cover" style={{ ['--cv' as string]: coverColor(book.slug) }}>
      <div className="cv-author">И. Глушков</div>
      <div>
        <div className="cv-title">{book.title}</div>
        <div className="cv-rule" />
        {year && <div className="cv-kind">{year}</div>}
      </div>
    </div>
  );
}
