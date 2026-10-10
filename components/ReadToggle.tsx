'use client';

import { statusOf, updateReading, useReading } from '@/lib/reading';

/** Ручная отметка: автоматике не всегда виднее, дочитал человек или нет */
export default function ReadToggle({ slug }: { slug: string }) {
  const reading = useReading();
  if (!reading) return null;
  const done = statusOf(reading[slug]) === 'done';

  return (
    <button
      className="btn ghost read-toggle"
      onClick={() => updateReading(slug, done ? { done: false, seen: 0, pos: 0 } : { done: true, seen: 1 })}
    >
      {done ? 'Вернуть в непрочитанные' : 'Отметить прочитанной'}
    </button>
  );
}
