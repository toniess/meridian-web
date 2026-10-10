'use client';

import { statusOf, useReading } from '@/lib/reading';

/**
 * Метка на обложке: галочка у прочитанной, полоса у начатой.
 * Отметки живут в браузере, поэтому на сервере метки нет — она
 * появляется, как только страница оживает.
 */
export default function ReadMark({ slug }: { slug: string }) {
  const reading = useReading();
  const state = reading?.[slug];
  const status = statusOf(state);
  if (status === 'new') return null;

  if (status === 'done') {
    return (
      <span className="read-mark done" title="Прочитано" aria-label="Прочитано">
        <svg viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.4l3 3 6-6.6" /></svg>
      </span>
    );
  }

  const pct = Math.round(Math.max(state!.seen, state!.pos) * 100);
  return (
    <span className="read-mark reading" aria-label={`Прочитано ${pct}%`}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Подпись под обложкой: «читаю, 40%» или «прочитано» */
export function ReadNote({ slug }: { slug: string }) {
  const reading = useReading();
  const state = reading?.[slug];
  const status = statusOf(state);
  if (status === 'new') return null;
  if (status === 'done') return <span className="read-note done">прочитано</span>;
  return <span className="read-note">прочитано {Math.round(Math.max(state!.seen, state!.pos) * 100)}%</span>;
}
