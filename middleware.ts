import { NextResponse, type NextRequest } from 'next/server';

/**
 * Один адрес сайта: https://igorglushkov.ru. Шлюз Cloud.ru перенаправлять не
 * умеет — у его правил нет условий ни по протоколу, ни по домену, — поэтому
 * это делает сам сайт по заголовкам, которые шлюз передаёт дальше.
 *
 * Редиректим только свои домены: адрес контейнера, системный домен шлюза и
 * localhost работают как раньше. Если нужных заголовков нет, middleware
 * ничего не делает — сайт от этого не ломается.
 */

const SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
const CANONICAL = SITE.host;

/**
 * http → https. Выключено, пока не проверено, что шлюз пишет в
 * X-Forwarded-Proto протокол читателя, а не своего соединения с контейнером:
 * иначе редирект зациклится. Проверить: curl -sI https://igorglushkov.ru
 * и curl -sI http://igorglushkov.ru — смотреть заголовок x-edge-seen.
 */
const FORCE_HTTPS = false;

const first = (v: string | null) => v?.split(',')[0].trim().toLowerCase() || null;

export function middleware(req: NextRequest) {
  const proto = first(req.headers.get('x-forwarded-proto'));
  const host = first(req.headers.get('x-forwarded-host')) ?? first(req.headers.get('host'));

  const isWww = host === `www.${CANONICAL}`;
  const insecure = FORCE_HTTPS && proto === 'http' && (host === CANONICAL || isWww);

  if (isWww || insecure) {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL}`);
    // 308, а не 301: сохраняет метод запроса, браузеры и поисковики кешируют так же
    return NextResponse.redirect(url, 308);
  }

  const res = NextResponse.next();
  // что пришло от шлюза — нужно, чтобы решить, можно ли включать FORCE_HTTPS
  res.headers.set('x-edge-seen', `proto=${proto ?? '-'}; host=${host ?? '-'}`);
  return res;
}

export const config = {
  // статике и картинкам редирект не нужен — не гоняем через middleware
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|images/).*)'],
};
