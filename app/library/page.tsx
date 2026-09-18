import BookCard from '@/components/BookCard';
import { listBooks } from '@/lib/api';
import { plural } from '@/lib/format';

export const metadata = { title: 'Библиотека' };

export default async function LibraryPage() {
  const books = await listBooks();

  return (
    <section className="wrap">
      <div className="sec-head">
        <h2>Библиотека</h2>
        <p>{books.length ? plural(books.length, 'книга', 'книги', 'книг') : ''}</p>
      </div>

      {books.length ? (
        <div className="grid-books">
          {books.map((b) => <BookCard key={b.slug} book={b} />)}
        </div>
      ) : (
        <div className="empty">Книг пока нет — первые появятся здесь.</div>
      )}
    </section>
  );
}
