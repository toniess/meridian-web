'use client';

import { useEffect, useState } from 'react';
import { normSearch } from '@/lib/search';

export type SearchItem = {
  key: string | number;
  /** Текст для поиска, уже приведённый через normSearch из lib/search */
  text: string;
  /** Готовая строка списка — её рендерит сервер */
  node: React.ReactNode;
};

/**
 * Поиск по списку прямо в браузере. Строки рендерит сервер, сюда приходят
 * только они и текст для поиска. Несколько слов — ищем все сразу.
 * Запрос попадает в адрес (?q=), чтобы результатом можно было поделиться.
 */
export default function SearchList({
  items,
  placeholder,
  label,
  className,
  title,
  note,
}: {
  items: SearchItem[];
  placeholder: string;
  label: string;
  className: string;
  /** Заголовок раздела и подпись к нему; пока идёт поиск, вместо подписи — сколько нашлось */
  title: string;
  note: string;
}) {
  const [query, setQuery] = useState('');

  // страница собирается статически, поэтому запрос из адреса читаем уже в браузере
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  const update = (q: string) => {
    setQuery(q);
    const url = new URL(window.location.href);
    if (q.trim()) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  };

  const words = normSearch(query).split(' ').filter(Boolean);
  const found = words.length ? items.filter(({ text }) => words.every((w) => text.includes(w))) : items;

  return (
    <>
      <div className="sec-head">
        <h2>{title}</h2>
        <p>{words.length ? `найдено ${found.length} из ${items.length}` : note}</p>
      </div>

      <div className="search">
        <input
          type="search"
          value={query}
          onChange={(e) => update(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && update('')}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {found.length ? (
        <div className={className}>{found.map((i) => <div className="search-item" key={i.key}>{i.node}</div>)}</div>
      ) : (
        <div className="empty">
          Ничего не нашлось.{' '}
          <button className="inline" onClick={() => update('')}>Показать всё</button>
        </div>
      )}
    </>
  );
}
