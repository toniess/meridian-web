'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NavLink = { href: string; label: string; match: string[] };

export default function Header({ projects }: { projects: { slug: string; title: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links: NavLink[] = [
    { href: '/library', label: 'Библиотека', match: ['/library', '/books', '/read'] },
    // проекты стоят в строке рядом с библиотекой: читателю не нужно
    // сначала заходить в раздел, чтобы выбрать проект
    ...projects.map((p) => ({
      href: `/projects/${p.slug}`,
      label: p.title,
      match: [`/projects/${p.slug}`],
    })),
    { href: '/about', label: 'Об авторе', match: ['/about'] },
  ];

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
          {links.map((l) => {
            const active = l.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
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
