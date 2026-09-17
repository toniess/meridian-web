'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * «Читать» превращается в «Продолжить», если читатель уже открывал книгу
 * на этом устройстве. Позиция хранится в браузере: в API её держать негде.
 */
export default function ContinueReading({
  slug,
  partsCount,
  partTitle,
}: {
  slug: string;
  partsCount: number;
  partTitle?: (index: number) => string;
}) {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`gl:pos:${slug}`);
      if (v !== null) setPos(Math.min(Math.max(Number(JSON.parse(v)) || 0, 0), partsCount - 1));
    } catch {
      /* ignore */
    }
  }, [slug, partsCount]);

  return (
    <Link className="btn" href={`/read/${slug}/${pos}`}>
      {pos > 0 ? `Продолжить: ${partTitle ? partTitle(pos) : `часть ${pos + 1}`}` : 'Читать'}
    </Link>
  );
}
