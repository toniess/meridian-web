'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/library', label: 'Библиотека', match: ['/library', '/books', '/read'] },
  { href: '/meridian', label: 'Меридиан', match: ['/meridian', '/projects', '/posts'] },
  { href: '/about', label: 'Об авторе', match: ['/about'] },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="top">
      <div className="wrap">
        <Link className="mark" href="/">Игорь Глушков</Link>
        <button
          className="burger"
          aria-expanded={open}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '≡'}
        </button>
        <nav className="nav" data-open={open}>
          {LINKS.map((l) => {
            const active = l.match.some((m) => pathname.startsWith(m));
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
