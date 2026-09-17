'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BookPart } from '@/lib/types';

const SIZE_MIN = 15;
const SIZE_MAX = 26;
const MEASURES = [28, 34, 42];
const READ_THEMES = [
  { id: 'ice', label: 'Лёд' },
  { id: 'paper', label: 'Бумага' },
  { id: 'sepia', label: 'Сепия' },
];

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`gl:${key}`);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`gl:${key}`, JSON.stringify(value));
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}

export default function ReaderChrome({
  bookSlug,
  bookTitle,
  parts,
  current,
  children,
}: {
  bookSlug: string;
  bookTitle: string;
  parts: { index: number; title: string }[];
  current: BookPart;
  children: React.ReactNode;
}) {
  const [size, setSize] = useState(19);
  const [measure, setMeasure] = useState(34);
  const [theme, setTheme] = useState('ice');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setSize(load('rsize', 19));
    setMeasure(load('measure', 34));
    setTheme(load('rtheme', 'ice'));
  }, []);

  useEffect(() => {
    save(`pos:${bookSlug}`, current.index);
  }, [bookSlug, current.index]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTocOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const prev = parts[current.index - 1];
  const next = parts[current.index + 1];

  const setSizeBy = (delta: number) => {
    const v = Math.max(SIZE_MIN, Math.min(SIZE_MAX, size + delta));
    setSize(v);
    save('rsize', v);
  };

  return (
    <>
      <div className="reader-bar">
        <div className="wrap">
          <Link className="back" href={`/books/${bookSlug}`}>← {bookTitle}</Link>
          <span className="title">· {current.title}</span>

          <div className="reader-tools">
            {parts.length > 1 && (
              <button className="tool" onClick={() => setTocOpen(true)}>
                Оглавление
              </button>
            )}
            <button className="tool" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>
              Аа
            </button>
          </div>

          <div className="progress" style={{ width: `${progress}%` }} />

          {settingsOpen && (
            <div className="settings">
              <div className="row">
                <span>Размер текста</span>
                <div className="seg">
                  <button onClick={() => setSizeBy(-1)} aria-label="Меньше">−</button>
                  <button onClick={() => setSizeBy(1)} aria-label="Больше">+</button>
                </div>
              </div>

              <div className="row">
                <span>Ширина колонки</span>
                <div className="seg">
                  {MEASURES.map((m, i) => (
                    <button
                      key={m}
                      aria-pressed={measure === m}
                      onClick={() => { setMeasure(m); save('measure', m); }}
                    >
                      {['узкая', 'средняя', 'широкая'][i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row">
                <span>Фон</span>
                <div className="seg">
                  {READ_THEMES.map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={theme === t.id}
                      onClick={() => { setTheme(t.id); save('rtheme', t.id); }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="reader"
        data-read-theme={theme}
        style={{ ['--rsize' as string]: `${size}px`, ['--measure' as string]: `${measure}em` }}
      >
        <div className="wrap">
          {children}
          <nav className="chapter-nav">
            {prev ? <Link href={`/read/${bookSlug}/${prev.index}`}>← {prev.title}</Link> : <span />}
            {next ? <Link href={`/read/${bookSlug}/${next.index}`}>{next.title} →</Link> : <span />}
          </nav>
        </div>
      </div>

      {tocOpen && (
        <div className="drawer">
          <button className="drawer-bg" aria-label="Закрыть оглавление" onClick={() => setTocOpen(false)} />
          <div className="drawer-panel">
            <h3>Оглавление</h3>
            {parts.map((p) => (
              <Link
                key={p.index}
                href={`/read/${bookSlug}/${p.index}`}
                aria-current={p.index === current.index}
                onClick={() => setTocOpen(false)}
              >
                {p.index + 1}. {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
