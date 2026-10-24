'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Headline from './Headline';
import { rusDate } from '@/lib/format';
import type { PostHit } from '@/lib/types';

type State = { q: string; hits: PostHit[] | null } | null;

/**
 * Поиск по записям всех проектов — на бекенде, по тексту и с морфологией.
 * Пока запроса нет, показывается список проектов (children). Если бекенд
 * поиска не умеет (enabled=false), поля поиска нет: внутри проекта есть свой.
 */
export default function ProjectsSearch({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<State>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  const q = query.trim();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);

    if (!enabled || q.length < 2) {
      setResult(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?scope=projects&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.status !== 200) return;
        setResult({ q, hits: (await res.json()) as PostHit[] });
      } catch {
        /* сеть — оставляем как есть */
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, enabled]);

  const hits = result?.q === q ? result.hits : null;

  return (
    <>
      {enabled && (
        <div className="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Поиск по записям всех проектов"
            aria-label="Поиск по записям проектов"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {!q || !enabled ? (
        children
      ) : (
        <div className="search-results">
          <p className="search-note">{hits ? (hits.length ? `Найдено: ${hits.length}` : '') : 'Ищем…'}</p>
          {hits && hits.length > 0 && (
            <div className="toc flush">
              {hits.map((p) => (
                <Link className="toc-item hit" key={p.id} href={`/posts/${p.id}`}>
                  <span className="t">
                    <b>{p.title}</b>
                    <small>
                      {p.project.title}
                      {p.publishedAt && ` · ${rusDate(p.publishedAt)}`}
                    </small>
                    <div className="post-excerpt"><Headline text={p.headline} /></div>
                  </span>
                </Link>
              ))}
            </div>
          )}
          {hits?.length === 0 && (
            <div className="empty">
              Ничего не нашлось.{' '}
              <button className="inline" onClick={() => setQuery('')}>Показать проекты</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
