import LibrarySearch from '@/components/LibrarySearch';
import { listBooks } from '@/lib/api';

export const metadata = { title: 'Библиотека' };

export default async function LibraryPage() {
  const books = await listBooks();

  return (
    <section className="wrap">
      {books.length ? (
        <LibrarySearch books={books} />
      ) : (
        <>
          <div className="sec-head">
            <h2>Библиотека</h2>
          </div>
          <div className="empty">Книг пока нет — первые появятся здесь.</div>
        </>
      )}
    </section>
  );
}
