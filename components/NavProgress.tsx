'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Отклик на клик по внутренней ссылке — сразу, ещё до ответа сервера.
 * Next показывает loading.tsx только когда сервер уже начал отвечать,
 * а до этого страница выглядит так, будто нажатие не сработало.
 * Поэтому полосу вверху и метку на нажатой ссылке ставим сами и
 * снимаем, как только сменился адрес.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // переход по якорю внутри той же страницы — грузить нечего
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      document.querySelectorAll('[data-pending]').forEach((el) => el.removeAttribute('data-pending'));
      a.setAttribute('data-pending', '');
      setActive(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    setActive(false);
    document.querySelectorAll('[data-pending]').forEach((el) => el.removeAttribute('data-pending'));
  }, [pathname, search]);

  return <div className="nav-progress" data-on={active} aria-hidden />;
}
