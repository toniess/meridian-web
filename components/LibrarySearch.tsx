import BookCard from './BookCard';
import SearchList from './SearchList';
import { plural } from '@/lib/format';
import { normSearch } from '@/lib/search';
import type { Book } from '@/lib/types';

/** Библиотека с поиском по названию и аннотации. */
export default function LibrarySearch({ books }: { books: Book[] }) {
  return (
    <SearchList
      className="grid-books"
      placeholder="Поиск по названию и аннотации"
      label="Поиск по библиотеке"
      title="Библиотека"
      note={plural(books.length, 'книга', 'книги', 'книг')}
      items={books.map((b) => ({
        key: b.slug,
        text: normSearch(`${b.title} ${b.description}`),
        node: <BookCard book={b} />,
      }))}
    />
  );
}
