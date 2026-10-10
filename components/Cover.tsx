import { COVER_AUTHOR, coverStyle, hash, pick, rng, titleSize } from '@/lib/cover';
import type { Book } from '@/lib/types';

/**
 * Обложка книги. Если картинки нет — рисуется одна из обложек серии
 * (стиль выбирается по slug, см. lib/cover.ts): так книга без
 * загруженной обложки выглядит решением, а не пропуском.
 */
export default function Cover({ book }: { book: Book }) {
  if (book.coverUrl) {
    return (
      <div className="cover cover-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={book.coverUrl} alt={`Обложка книги «${book.title}»`} />
      </div>
    );
  }

  switch (coverStyle(book.slug)) {
    case 'pattern': return <PatternCover book={book} />;
    case 'letter': return <LetterCover book={book} />;
    case 'cloth': return <ClothCover book={book} />;
  }
}

/** Генеративный узор: волны реки, круги, штриховка или сетка точек */
function PatternCover({ book }: { book: Book }) {
  const r = rng(book.slug);
  const bg = pick(r, ['#1E3442', '#2A3340', '#2F3A33', '#3A2F3D', '#3B3226', '#203C44']);
  const kind = pick(r, ['waves', 'rings', 'hatch', 'dots'] as const);
  const shapes: React.ReactNode[] = [];

  if (kind === 'waves') {
    const amp = 3 + r() * 5;
    for (let y = 8; y < 110; y += 7) {
      const ph = r() * 20;
      shapes.push(
        <path key={y} d={`M-10 ${y} Q${10 + ph} ${y - amp} ${30 + ph} ${y} T${70 + ph} ${y} T${110 + ph} ${y}`} />,
      );
    }
  } else if (kind === 'rings') {
    const cx = r() * 80 + 10;
    const cy = r() * 60 + 5;
    for (let rad = 6; rad < 140; rad += 6 + r() * 4) shapes.push(<circle key={rad} cx={cx} cy={cy} r={rad} />);
  } else if (kind === 'hatch') {
    const step = 4 + r() * 4;
    for (let x = -120; x < 120; x += step) shapes.push(<line key={x} x1={x} y1={0} x2={x + 100} y2={100} />);
  } else {
    for (let y = 5; y < 100; y += 6)
      for (let x = 5; x < 100; x += 6) {
        const d = Math.hypot(x - 50, y - 30) / 70;
        shapes.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={Math.max(0.3, 1.8 - d * 1.6)} className="fill" />);
      }
  }

  return (
    <div className="cover cv-pattern" style={{ ['--cb' as string]: bg }}>
      <svg className="p-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {shapes}
      </svg>
      <div className="p-plate">
        <div className={`p-title t-${titleSize(book.title)}`}>{book.title}</div>
        <div className="p-author">{COVER_AUTHOR}</div>
      </div>
    </div>
  );
}

/** Крупная буквица: первая буква названия на всю обложку, обрезанная краем */
function LetterCover({ book }: { book: Book }) {
  const r = rng(book.slug);
  const [bg, fg] = pick(r, [
    ['#C4512F', '#F3E3D3'],
    ['#E3B341', '#2B2A26'],
    ['#2F6F73', '#E8F1EE'],
    ['#8FC7DC', '#14222B'],
    ['#6B4E8C', '#F0E9F5'],
    ['#2A2F36', '#E7C27A'],
  ]);
  const letter = book.title.replace(/^[^A-Za-zА-Яа-яЁё0-9]+/, '').charAt(0).toUpperCase();
  return (
    <div className="cover cv-letter" style={{ ['--cb' as string]: bg, ['--cf' as string]: fg }}>
      <div className="l-big" style={{ left: `${-8 + r() * 14}%` }} aria-hidden>{letter}</div>
      <div className="l-text">
        <div className={`l-title t-${titleSize(book.title)}`}>{book.title}</div>
        <div className="l-author">{COVER_AUTHOR}</div>
      </div>
    </div>
  );
}

/** Тканевый переплёт с золотым тиснением и рамкой */
function ClothCover({ book }: { book: Book }) {
  const r = rng(book.slug);
  const bg = pick(r, ['#2C3E50', '#4A2C2A', '#2F4A3A', '#3D3350', '#1F3A44', '#4A3B24']);
  const id = `cloth-${hash(book.slug)}`;
  return (
    <div className="cover cv-cloth" style={{ ['--cb' as string]: bg }}>
      <svg className="c-tex" aria-hidden>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed={hash(book.slug) % 100} />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .13 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
      <div className="c-frame">
        <div className="c-author">{COVER_AUTHOR}</div>
        <div>
          <div className="c-orn">❦</div>
          <div className={`c-title t-${titleSize(book.title)}`}>{book.title}</div>
          <div className="c-orn">✦</div>
        </div>
        <div />
      </div>
    </div>
  );
}
