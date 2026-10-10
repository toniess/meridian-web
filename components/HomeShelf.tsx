'use client';

import Link from 'next/link';
import { statusOf, useReading, type Reading } from '@/lib/reading';

const SHELF = 4;

/**
 * Что предложить почитать: сначала начатые (последняя открытая — первой),
 * потом не начатые в обычном порядке. Прочитанные не предлагаем.
 */
function pick<T extends { slug: string }>(books: T[], reading: Reading): T[] {
  const started = books
    .filter((b) => statusOf(reading[b.slug]) === 'reading')
    .sort((a, b) => reading[b.slug].at - reading[a.slug].at);
  const fresh = books.filter((b) => statusOf(reading[b.slug]) === 'new');
  return [...started, ...fresh];
}

/**
 * Полка на главной. Отметки чтения есть только в браузере, поэтому сервер
 * отдаёт карточки всех книг, а какие показать — решается здесь. До этого
 * момента видны первые книги, как у читателя, который ещё ничего не открывал.
 */
export default function HomeShelf({ books }: { books: { slug: string; node: React.ReactNode }[] }) {
  const reading = useReading();
  const shown = reading ? pick(books, reading).slice(0, SHELF) : books.slice(0, SHELF);

  if (!shown.length) {
    return (
      <div className="empty">
        Все книги прочитаны — новые появятся здесь. <Link className="inline" href="/library">Вся библиотека</Link>
      </div>
    );
  }
  return <div className="grid-books">{shown.map((b) => <div className="search-item" key={b.slug}>{b.node}</div>)}</div>;
}

/** Главная кнопка героя: продолжить начатую книгу или взять первую непрочитанную */
export function HeroRead({ books }: { books: { slug: string; title: string }[] }) {
  const reading = useReading();
  const list = reading ? pick(books, reading) : books;
  const next = list[0];

  if (!next) return <Link className="btn" href="/library">Библиотека</Link>;
  const started = reading && statusOf(reading[next.slug]) === 'reading';
  return (
    <Link className="btn" href={`/books/${next.slug}`}>
      {started ? 'Продолжить' : 'Читать'} «{next.title}»
    </Link>
  );
}
