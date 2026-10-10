'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem('gl:theme', JSON.stringify(next));
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  };

  const label = theme === 'light' ? 'Тёмная тема' : 'Светлая тема';

  return (
    <button className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {/* до гидратации тема неизвестна — рисуем обе иконки, CSS покажет нужную */}
      <svg className="i-sun" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
      <svg className="i-moon" viewBox="0 0 24 24" aria-hidden>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
