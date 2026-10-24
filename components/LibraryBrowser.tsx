'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Headline from './Headline';
import { plural } from '@/lib/format';
import { normSearch } from '@/lib/search';
import type { Book, Collection, Found } from '@/lib/types';

/**
 * Библиотека: вкладки «Рассказы» и «Сборники», фильтры и поиск.
 *
 * Карточки рендерит сервер, сюда приходят готовые узлы и то, по чему
 * фильтровать. Поиск двухступенчатый: совпадения в названиях видны сразу,
 * а через мгновение их сменяет поиск по тексту на бекенде — с морфологией
 * и фрагментом, где нашлось. Если бекенд поиска не умеет, остаются названия.
 * Всё состояние — в адресе, чтобы им можно было поделиться.
 */

export type Entry = {
  key: string;
  node: React.ReactNode;
  title: string;
  /** Название и аннотация через normSearch */
  text: string;
  /** Дата публикации, ISO; '' — без даты */
  date: string;
  /** slug сборника; null — самостоятельное произведение */
  collection: string | null;
};

type Tab = 'stories' | 'collections';
type Sort = 'new' | 'old' | 'az';
type Hits = { books: Found<Book>[]; collections: Found<Collection>[] };
type Search = { q: string; state: 'loading' } | { q: string; state: 'done'; hits: Hits } | { q: string; state: 'unavailable' };

const NONE = 'none';
const SORTS: [Sort, string][] = [
  ['new', 'сначала новые'],
  ['old', 'сначала старые'],
  ['az', 'по алфавиту'],
];

const year = (e: Entry) => e.date.slice(0, 4);

/** Сортировка устойчивая: при одинаковой дате остаётся порядок, заданный автором в админке */
function sorted(items: Entry[], sort: Sort): Entry[] {
  const out = [...items];
  if (sort === 'az') return out.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  if (sort === 'old') return out.sort((a, b) => a.date.localeCompare(b.date));
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export default function LibraryBrowser({
  stories,
  collections,
  collectionTitles,
  textSearch,
}: {
  stories: Entry[];
  collections: Entry[];
  /** slug → название, для фильтра и подписей */
  collectionTitles: Record<string, string>;
  /** Бекенд умеет искать по тексту; иначе ищем только по названиям */
  textSearch: boolean;
}) {
  const [tab, setTab] = useState<Tab>('stories');
  const [coll, setColl] = useState('');
  const [yearFilter, setYear] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Search | null>(null);

  // страница собирается статически, поэтому состояние из адреса читаем уже в браузере
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab') === 'collections') setTab('collections');
    setColl(p.get('c') ?? '');
    setYear(p.get('y') ?? '');
    const s = p.get('sort');
    if (s === 'old' || s === 'az') setSort(s);
    setQuery(p.get('q') ?? '');
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string, def = '') => (v && v !== def ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('tab', tab, 'stories');
    set('c', tab === 'stories' ? coll : '');
    set('y', yearFilter);
    set('sort', sort, 'new');
    set('q', query.trim());
    window.history.replaceState(null, '', url);
  }, [tab, coll, yearFilter, sort, query]);

  // поиск по тексту — с паузой, чтобы не спрашивать бекенд на каждую букву
  const q = query.trim();
  useEffect(() => {
    if (!textSearch || q.length < 2) {
      setSearch(null);
      return;
    }
    setSearch({ q, state: 'loading' });
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?scope=library&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.status !== 200) throw new Error(String(res.status));
        setSearch({ q, state: 'done', hits: (await res.json()) as Hits });
      } catch {
        if (!ctrl.signal.aborted) setSearch({ q, state: 'unavailable' });
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, textSearch]);

  const items = tab === 'stories' ? stories : collections;
  const years = useMemo(
    () => [...new Set(items.map(year).filter(Boolean))].sort().reverse(),
    [items],
  );
  const shown = useMemo(() => {
    let list = items;
    if (tab === 'stories' && coll) list = list.filter((e) => (coll === NONE ? !e.collection : e.collection === coll));
    if (yearFilter) list = list.filter((e) => year(e) === yearFilter);
    return sorted(list, sort);
  }, [items, tab, coll, yearFilter, sort]);

  const filtered = Boolean(coll || yearFilter);
  const reset = () => {
    setColl('');
    setYear('');
  };

  return (
    <>
      <div className="sec-head">
        <h2>Библиотека</h2>
        <p>
          {plural(stories.length, 'рассказ', 'рассказа', 'рассказов')}
          {collections.length > 0 && `, ${plural(collections.length, 'сборник', 'сборника', 'сборников')}`}
        </p>
      </div>

      <div className="search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder={textSearch ? 'Поиск по названиям и тексту' : 'Поиск по названию и аннотации'}
          aria-label="Поиск по библиотеке"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {q ? (
        <SearchResults
          q={q}
          search={search}
          stories={stories}
          collections={collections}
          collectionTitles={collectionTitles}
          onClear={() => setQuery('')}
        />
      ) : (
        <>
          {collections.length > 0 && (
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'stories'} onClick={() => setTab('stories')}>
                Рассказы <span>{stories.length}</span>
              </button>
              <button role="tab" aria-selected={tab === 'collections'} onClick={() => setTab('collections')}>
                Сборники <span>{collections.length}</span>
              </button>
            </div>
          )}

          <div className="filters">
            {tab === 'stories' && collections.length > 0 && (
              <label>
                <span>Сборник</span>
                <select value={coll} onChange={(e) => setColl(e.target.value)}>
                  <option value="">все</option>
                  <option value={NONE}>вне сборников</option>
                  {Object.entries(collectionTitles).map(([slug, title]) => (
                    <option key={slug} value={slug}>{title}</option>
                  ))}
                </select>
              </label>
            )}
            {years.length > 1 && (
              <label>
                <span>Год</span>
                <select value={yearFilter} onChange={(e) => setYear(e.target.value)}>
                  <option value="">любой</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            )}
            <label>
              <span>Порядок</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
            {filtered && (
              <button className="inline" onClick={reset}>сбросить</button>
            )}
          </div>

          {shown.length ? (
            <div className="grid-books">{shown.map((e) => <div className="search-item" key={e.key}>{e.node}</div>)}</div>
          ) : (
            <div className="empty">
              Под эти условия ничего не подходит.{' '}
              <button className="inline" onClick={reset}>Сбросить фильтры</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function SearchResults({
  q,
  search,
  stories,
  collections,
  collectionTitles,
  onClear,
}: {
  q: string;
  search: Search | null;
  stories: Entry[];
  collections: Entry[];
  collectionTitles: Record<string, string>;
  onClear: () => void;
}) {
  const done = search?.q === q && search.state === 'done' ? search.hits : null;

  // пока бекенд думает (или если он поиска не умеет) — совпадения в названиях
  const words = normSearch(q).split(' ').filter(Boolean);
  const local = (list: Entry[]) => list.filter((e) => words.every((w) => e.text.includes(w)));

  const rows: { key: string; href: string; title: string; sub?: string; headline?: string }[] = done
    ? [
        ...done.collections.map((c) => ({
          key: `c:${c.slug}`,
          href: `/collections/${c.slug}`,
          title: c.title,
          sub: 'сборник',
          headline: c.headline,
        })),
        ...done.books.map((b) => ({
          key: `b:${b.slug}`,
          href: `/books/${b.slug}`,
          title: b.title,
          sub: b.collection ? `из сборника «${b.collection.title}»` : undefined,
          headline: b.headline,
        })),
      ]
    : [
        ...local(collections).map((e) => ({ key: `c:${e.key}`, href: `/collections/${e.key}`, title: e.title, sub: 'сборник' })),
        ...local(stories).map((e) => ({
          key: `b:${e.key}`,
          href: `/books/${e.key}`,
          title: e.title,
          sub: e.collection ? `из сборника «${collectionTitles[e.collection]}»` : undefined,
        })),
      ];

  const pending = search?.q === q && search.state === 'loading';

  return (
    <div className="search-results">
      <p className="search-note">
        {done
          ? rows.length ? `Найдено: ${rows.length}` : ''
          : pending ? 'Совпадения в названиях. Ищем в тексте…' : 'Совпадения в названиях'}
      </p>
      {rows.length ? (
        <div className="toc flush">
          {rows.map((r) => (
            <Link className="toc-item hit" key={r.key} href={r.href}>
              <span className="t">
                <b>{r.title.replace(/\s+/g, ' ')}</b>
                {r.sub && <small>{r.sub}</small>}
                {r.headline && <div className="post-excerpt"><Headline text={r.headline} /></div>}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        !pending && (
          <div className="empty">
            Ничего не нашлось.{' '}
            <button className="inline" onClick={onClear}>Показать всё</button>
          </div>
        )
      )}
    </div>
  );
}
