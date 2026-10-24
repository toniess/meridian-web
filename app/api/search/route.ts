import { searchLibrary, searchPosts } from '@/lib/api';

/**
 * Поиск по тексту для браузера: /api/search?scope=library|projects&q=…
 * Браузер ходит сюда, а не на бекенд: CSP разрешает запросы только к
 * нашему адресу, а адрес бекенда читателю знать незачем.
 *
 * 204 — бекенд поиска не умеет или недоступен: страница остаётся
 * с поиском по названиям.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').slice(0, 200);
  const scope = url.searchParams.get('scope');

  const result =
    scope === 'library' ? await searchLibrary(q) :
    scope === 'projects' ? await searchPosts(q) :
    undefined;

  if (result === undefined) return Response.json({ error: 'scope: library или projects' }, { status: 400 });
  if (result === null) return new Response(null, { status: 204 });
  return Response.json(result, { headers: { 'cache-control': 'no-store' } });
}
