import Link from 'next/link';
import Cover from './Cover';
import { extFromUrl, AUDIO_EXT } from '@/lib/content';
import type { Book } from '@/lib/types';

export default function BookCard({ book }: { book: Book }) {
  const ext = book.fileUrl ? extFromUrl(book.fileUrl) : '';
  const isAudio = AUDIO_EXT.includes(ext);

  return (
    <Link className="book-card" href={`/books/${book.slug}`}>
      <Cover book={book} />
      <h3>{book.title}</h3>
      <div className="book-meta">
        {isAudio && <span className="has-audio">аудиокнига</span>}
        {!isAudio && ext && <span>{ext.toUpperCase()}</span>}
        {!book.fileUrl && <span>готовится</span>}
      </div>
    </Link>
  );
}
