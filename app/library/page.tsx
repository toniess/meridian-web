import BookCard from '@/components/BookCard';
import CollectionCard from '@/components/CollectionCard';
import LibraryBrowser, { type Entry } from '@/components/LibraryBrowser';
import { canSearch, listBooks, listCollections } from '@/lib/api';
import { normSearch } from '@/lib/search';

export const metadata = { title: 'Библиотека' };

export default async function LibraryPage() {
  const [books, collections, textSearch] = await Promise.all([
    listBooks(),
    listCollections(),
    canSearch('library'),
  ]);

  const stories: Entry[] = books.map((b) => ({
    key: b.slug,
    node: <BookCard book={b} />,
    title: b.title,
    text: normSearch(`${b.title} ${b.description}`),
    date: b.publishedAt ?? '',
    collection: b.collection?.slug ?? null,
  }));
  const editions: Entry[] = collections.map((c) => ({
    key: c.slug,
    node: <CollectionCard collection={c} />,
    title: c.title,
    text: normSearch(`${c.title} ${c.description}`),
    date: c.publishedAt ?? '',
    collection: null,
  }));

  return (
    <section className="wrap">
      {books.length || collections.length ? (
        <LibraryBrowser
          stories={stories}
          collections={editions}
          collectionTitles={Object.fromEntries(collections.map((c) => [c.slug, c.title]))}
          textSearch={textSearch}
        />
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
