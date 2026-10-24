'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { Orientation, PageFlip } from 'page-flip/dist/js/page-flip.module.js';
import { track } from '@/lib/analytics';

/**
 * Читалка PDF разворотом, как печатная книга: на широком экране две
 * страницы рядом и страница переворачивается, на телефоне — по одной.
 * Листать можно стрелками, клавишами ←/→, щелчком по краю страницы и свайпом.
 *
 * Страницы рисует pdf.js, и только те, что рядом с открытой: в книге
 * может быть несколько сотен страниц, а холст на каждую — это память.
 * Где читатель остановился, запоминается в браузере.
 */

type Props = {
  /** Адрес PDF на нашем домене, см. app/files/[kind]/[name]/route.ts */
  src: string;
  /** Прямая ссылка на файл в хранилище: скачивать целиком лучше мимо сервера сайта */
  downloadHref: string;
  title: string;
  backHref: string;
  /** Ключ для запоминания страницы, например book:slug */
  storageKey: string;
};

type Status = { kind: 'loading'; progress: number } | { kind: 'ready' } | { kind: 'error' };

const PDFJS = '/pdfjs/';
/** Сколько страниц рисовать вокруг открытой */
const AHEAD = 3;
/** Холсты дальше этого расстояния от открытой страницы освобождаются */
const KEEP = 8;
/** Высота панели под книгой и отступы — книга должна поместиться в экран целиком */
const CHROME = 150;

const posKey = (key: string) => `gl:pdf:${key}`;

/** Страница из адреса (#p=12, с единицы) — ей можно поделиться; иначе — где остановились */
function startPage(key: string): number {
  const fromHash = Number(new URLSearchParams(window.location.hash.slice(1)).get('p'));
  if (fromHash > 0) return fromHash - 1;
  try {
    return Number(localStorage.getItem(posKey(key))) || 0;
  } catch {
    return 0;
  }
}

export default function PdfFlipbook({ src, downloadHref, title, backHref, storageKey }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);

  const [status, setStatus] = useState<Status>({ kind: 'loading', progress: 0 });
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const book = bookRef.current;
    const shell = shellRef.current;
    if (!book || !shell) return;

    let cancelled = false;
    let loading: PDFDocumentLoadingTask | null = null;
    let doc: PDFDocumentProxy | null = null;
    let flip: PageFlip | null = null;
    let ratio = 0.7;
    const canvases: HTMLCanvasElement[] = [];
    // что нарисовано на холсте: ширина страницы в пикселях экрана
    const drawnAt = new Map<number, number>();
    const tasks = new Map<number, RenderTask>();

    /** Книга вписывается в экран и по ширине, и по высоте */
    const fit = () => {
      if (!flip) return;
      const free = (document.fullscreenElement ? window.innerHeight - 70 : window.innerHeight - CHROME);
      const pageW = Math.max(160, free * ratio);
      const wide = flip.getOrientation() === 'landscape';
      book.style.maxWidth = `${Math.round(wide ? pageW * 2 : pageW)}px`;
      flip.update();
    };

    const render = async (index: number) => {
      if (!doc || !flip || index < 0 || index >= canvases.length) return;
      // не по элементу страницы: невидимые page-flip скрывает, и ширина у них 0
      const cssWidth = book.clientWidth / (flip.getOrientation() === 'landscape' ? 2 : 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const target = Math.round(cssWidth * dpr);
      if (!target || drawnAt.get(index) === target || tasks.has(index)) return;

      const pdfPage = await doc.getPage(index + 1);
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: target / base.width });
      // рисуем в отдельный холст и подменяем готовым: иначе страница мигает пустой
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const task = pdfPage.render({ canvas, viewport });
      tasks.set(index, task);
      try {
        await task.promise;
      } catch {
        return; // отменили — страница ушла далеко или читалку закрыли
      } finally {
        tasks.delete(index);
      }
      if (cancelled) return;
      canvases[index].replaceWith(canvas);
      canvases[index] = canvas;
      drawnAt.set(index, target);
    };

    const renderAround = (current: number) => {
      for (let i = current - 1; i <= current + AHEAD; i++) void render(i);
      // далёкие страницы отпускаем: и холст, и декодированные картинки
      // страницы внутри pdf.js — у скана это десятки мегабайт на страницу
      drawnAt.forEach((_, i) => {
        if (Math.abs(i - current) > KEEP) {
          tasks.get(i)?.cancel();
          canvases[i].width = canvases[i].height = 0;
          drawnAt.delete(i);
          void doc?.getPage(i + 1).then((p) => p.cleanup());
        }
      });
    };

    (async () => {
      try {
        const [pdfjs, { PageFlip }] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('page-flip/dist/js/page-flip.module.js'),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
        const task = (loading = pdfjs.getDocument({
          url: src,
          cMapUrl: `${PDFJS}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${PDFJS}standard_fonts/`,
          wasmUrl: `${PDFJS}wasm/`,
          iccUrl: `${PDFJS}iccs/`,
          // только куски, нужные открытым страницам. По умолчанию pdf.js
          // докачивает файл целиком: для скана на 200 МБ это 200 МБ на каждое
          // открытие, в том числе с телефона
          rangeChunkSize: 256 * 1024,
          disableAutoFetch: true,
          disableStream: true,
        }));
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          // при загрузке по частям прогресс приходит и после открытия — на каждую
          // догруженную страницу; полоса нужна только до первой
          if (total && !cancelled && !doc) setStatus({ kind: 'loading', progress: loaded / total });
        };
        doc = await task.promise;
        if (cancelled) return;

        const first = (await doc.getPage(1)).getViewport({ scale: 1 });
        ratio = first.width / first.height;

        const pages = Array.from({ length: doc.numPages }, (_, i) => {
          const el = document.createElement('div');
          el.className = 'flip-page';
          // обложки твёрдые, как у переплёта
          el.dataset.density = i === 0 || i === doc!.numPages - 1 ? 'hard' : 'soft';
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 0;
          el.appendChild(canvas);
          book.appendChild(el);
          canvases.push(canvas);
          return el;
        });

        const start = Math.min(startPage(storageKey), doc.numPages - 1);
        flip = new PageFlip(book, {
          width: Math.round(ratio * 1000),
          height: 1000,
          size: 'stretch',
          // уже 2 × 300 px — по одной странице
          minWidth: 300,
          maxWidth: 2000,
          minHeight: 200,
          maxHeight: 3000,
          showCover: true,
          usePortrait: true,
          // иначе свайп по книге на телефоне прокручивает страницу
          mobileScrollSupport: false,
          maxShadowOpacity: 0.35,
          flippingTime: 650,
          startPage: start,
        });
        flipRef.current = flip;
        flip.loadFromHTML(pages);

        flip.on('flip', (e) => {
          setPage(e.data);
          renderAround(e.data);
          window.history.replaceState(null, '', `#p=${e.data + 1}`);
          try {
            localStorage.setItem(posKey(storageKey), String(e.data));
          } catch {
            /* приватный режим */
          }
        });
        flip.on('changeOrientation', (e) => {
          setOrientation(e.data);
          fit();
          // ширина страницы поменялась — перерисовать чётко, когда page-flip перестроится
          drawnAt.clear();
          requestAnimationFrame(() => flip && renderAround(flip.getCurrentPageIndex()));
        });

        setCount(doc.numPages);
        setPage(flip.getCurrentPageIndex());
        setOrientation(flip.getOrientation());
        setStatus({ kind: 'ready' });
        fit();
        requestAnimationFrame(() => flip && renderAround(flip.getCurrentPageIndex()));
        track('Листание', { title });
      } catch {
        if (!cancelled) setStatus({ kind: 'error' });
      }
    })();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fit();
        drawnAt.clear();
        if (flip) renderAround(flip.getCurrentPageIndex());
      }, 150);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onResize);
      tasks.forEach((t) => t.cancel());
      flip?.destroy();
      flipRef.current = null;
      void loading?.destroy();
      // страницы page-flip перенёс к себе и при destroy убрал; остатки — на случай ошибки
      book.replaceChildren();
    };
  }, [src, storageKey, title]);

  const prev = useCallback(() => flipRef.current?.flipPrev(), []);
  const next = useCallback(() => flipRef.current?.flipNext(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [prev, next]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen?.();
  };

  // в развороте видны две страницы: обложка одна, дальше пары 2–3, 4–5…
  const wide = orientation === 'landscape';
  const shown =
    !count ? '' :
    !wide || page === 0 || page >= count - 1 ? `${page + 1}` :
    `${page + 1}–${Math.min(page + 2, count)}`;

  return (
    <div className="flipbook" ref={shellRef} data-fullscreen={fullscreen || undefined}>
      <div className="flip-stage">
        <div className="flip-book" ref={bookRef} />

        {status.kind === 'loading' && (
          <div className="flip-status">
            <div className="flip-progress"><i style={{ width: `${Math.round(status.progress * 100)}%` }} /></div>
            Открываем книгу…
          </div>
        )}
        {status.kind === 'error' && (
          <div className="flip-status">
            <p>Открыть книгу не получилось. Попробуйте обновить страницу или скачайте файл.</p>
            <a className="btn" href={downloadHref} download>Скачать PDF</a>
          </div>
        )}
      </div>

      <div className="flip-bar">
        <Link className="flip-back" href={backHref}>← {title}</Link>
        <div className="flip-nav">
          <button className="pmini" onClick={prev} disabled={status.kind !== 'ready' || page === 0} aria-label="Предыдущая страница">‹</button>
          <span className="flip-count">{count ? `${shown} из ${count}` : ''}</span>
          <button className="pmini" onClick={next} disabled={status.kind !== 'ready' || page >= count - 1} aria-label="Следующая страница">›</button>
        </div>
        <div className="flip-tools">
          <button className="pmini" onClick={toggleFullscreen} aria-label={fullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}>
            {fullscreen ? '⤡' : '⤢'}
          </button>
          <a className="pmini" href={downloadHref} download aria-label="Скачать PDF">↓</a>
        </div>
      </div>
    </div>
  );
}
