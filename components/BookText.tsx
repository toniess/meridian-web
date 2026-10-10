'use client';

import { useEffect, useRef, useState } from 'react';
import ReadToggle from './ReadToggle';
import { readingOf, updateReading, useReading } from '@/lib/reading';

const SIZE_MIN = 15;
const SIZE_MAX = 26;
const MEASURES = [28, 34, 42];
/** Сколько надо пробыть на странице с концом текста на экране, чтобы книга засчиталась */
const DONE_AFTER_MS = 4000;

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

/**
 * Текст книги прямо на её странице. Сверху — панель, которая прилипает
 * при прокрутке: настройки чтения, прогресс по тексту и, если частей
 * несколько, оглавление. Части идут подряд, оглавление ведёт к якорям.
 */
export default function BookText({
  slug,
  bookTitle,
  parts,
  children,
}: {
  slug: string;
  bookTitle: string;
  parts: { index: number; title: string }[];
  children: React.ReactNode;
}) {
  const [size, setSize] = useState(19);
  const [measure, setMeasure] = useState(34);
  const [theme, setTheme] = useState('ice');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(load('rsize', 19));
    setMeasure(load('measure', 34));
    setTheme(load('rtheme', 'ice'));
  }, []);

  const reading = useReading();
  const state = reading?.[slug];
  // «Продолжить» — по месту из прошлого визита; читается один раз при открытии
  const [resumeAt, setResumeAt] = useState(0);

  // Прогресс считается по самому тексту, а не по всей странице с шапкой.
  // seen — какая доля текста уже показывалась на экране, pos — где читатель
  // сейчас. Книга прочитана, когда её конец пробыл на экране DONE_AFTER_MS.
  useEffect(() => {
    const prev = readingOf(slug);
    if (prev && !prev.done && prev.pos > 0.05 && prev.pos < 0.97) setResumeAt(prev.pos);

    let seen = prev?.seen ?? 0;
    let done = Boolean(prev?.done);
    // место пишем только после прокрутки: открыть книгу и уйти — не значит потерять закладку
    let moved = false;
    // кто-то другой записал отметку (кнопка «непрочитано», другая вкладка) —
    // до конца визита не спорим с ним
    let paused = false;
    let lastAt = 0;
    let lastSaved = 0;
    let endSince: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const measure = () => {
      const el = textRef.current;
      if (!el) return null;
      const { top, height, bottom } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const range = height - vh;
      return {
        pos: range > 0 ? Math.min(1, Math.max(0, -top / range)) : top < 0 ? 1 : 0,
        visible: Math.min(1, Math.max(0, (vh - top) / height)),
        endOnScreen: bottom <= vh + 8 && bottom > 0,
      };
    };

    // открыл и сразу ушёл — книга не начата: пишем, только когда читатель
    // прокрутил текст или пробыл на странице хоть немного
    const openedAt = Date.now();
    const engaged = () => moved || Date.now() - openedAt >= DONE_AFTER_MS;

    const write = (patch: Parameters<typeof updateReading>[1]) => {
      if (!engaged()) return;
      const cur = readingOf(slug);
      if (lastAt && cur?.at !== lastAt) paused = true;
      if (paused) return;
      lastAt = updateReading(slug, patch)?.at ?? 0;
      lastSaved = Date.now();
    };
    const save = (pos: number) => write(moved ? { seen, pos } : { seen });

    const tick = () => {
      const m = measure();
      if (!m) return;
      setProgress(m.pos * 100);
      seen = Math.max(seen, m.visible);

      if (m.endOnScreen && !done) {
        endSince ??= Date.now();
        clearTimeout(timer);
        timer = setTimeout(() => {
          const again = measure();
          if (again?.endOnScreen) {
            done = true;
            write({ seen: 1, pos: again.pos, done: true });
          }
        }, DONE_AFTER_MS - (Date.now() - endSince));
      } else if (!m.endOnScreen) {
        endSince = null;
        clearTimeout(timer);
      }
      // localStorage не дёргаем на каждый пиксель прокрутки
      if (Date.now() - lastSaved > 600) save(m.pos);
    };
    const onScroll = () => { moved = true; tick(); };

    tick();
    // без прокрутки tick больше не вызовется — досохраняем, когда чтение «засчиталось»
    const engageTimer = setTimeout(tick, DONE_AFTER_MS + 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', tick);
    const flush = () => { const m = measure(); if (m) save(m.pos); };
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      clearTimeout(engageTimer);
      flush();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', tick);
      window.removeEventListener('pagehide', flush);
    };
  }, [slug]);

  const resume = () => {
    const el = textRef.current;
    if (!el || !resumeAt) return;
    const range = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + range * resumeAt, behavior: 'smooth' });
    setResumeAt(0);
  };

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

  const setSizeBy = (delta: number) => {
    const v = Math.max(SIZE_MIN, Math.min(SIZE_MAX, size + delta));
    setSize(v);
    save('rsize', v);
  };

  return (
    <>
      <div className="reader-bar">
        <div className="wrap">
          <span className="title">{bookTitle}</span>

          <div className="reader-tools">
            {resumeAt ? (
              <button className="tool tool-accent" onClick={resume}>
                Продолжить с {Math.round(resumeAt * 100)}%
              </button>
            ) : null}
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
        ref={textRef}
        className="reader"
        data-read-theme={theme}
        style={{ ['--rsize' as string]: `${size}px`, ['--measure' as string]: `${measure}em` }}
      >
        <div className="wrap">
          {children}
          <div className="read-end">
            {state?.done ? <p>Книга прочитана.</p> : null}
            <ReadToggle slug={slug} />
          </div>
        </div>
      </div>

      {tocOpen && (
        <div className="drawer">
          <button className="drawer-bg" aria-label="Закрыть оглавление" onClick={() => setTocOpen(false)} />
          <div className="drawer-panel">
            <h3>Оглавление</h3>
            {parts.map((p) => (
              <a key={p.index} href={`#part-${p.index}`} onClick={() => setTocOpen(false)}>
                {p.index + 1}. {p.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
