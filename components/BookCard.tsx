import Link from 'next/link';
import Cover from './Cover';
import ReadMark, { ReadNote } from './ReadMark';
import { extFromUrl, AUDIO_EXT } from '@/lib/content';
import type { Book } from '@/lib/types';

export default function BookCard({ book }: { book: Book }) {
  const isAudio = book.fileUrl ? AUDIO_EXT.includes(extFromUrl(book.fileUrl)) : false;

  return (
    <Link className="book-card" href={`/books/${book.slug}`}>
      <div className="cover-wrap">
        <Cover book={book} />
        <ReadMark slug={book.slug} />
      </div>
      <h3>{book.title}</h3>
      {/* формат файла читателю ничего не говорит — подписываем только то, что меняет дело */}
      <div className="book-meta">
        {isAudio && <span className="has-audio">аудиокнига</span>}
        {!book.fileUrl && <span>готовится</span>}
        <ReadNote slug={book.slug} />
      </div>
    </Link>
  );
}
