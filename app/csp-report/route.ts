/**
 * Сюда браузеры шлют нарушения Content-Security-Policy (см. next.config.mjs).
 * Просто пишем их в лог контейнера. Адрес открыт всем, поэтому тело режем
 * и ничего не храним.
 */
export async function POST(req: Request) {
  const body = (await req.text()).slice(0, 2000);
  console.warn('[csp]', body.replace(/\s+/g, ' '));
  return new Response(null, { status: 204 });
}
