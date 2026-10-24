import { notFound } from 'next/navigation';
import { getBook, getCollection } from '@/lib/api';
import { extFromUrl } from '@/lib/content';

/**
 * PDF книги или сборника с нашего адреса: /files/book/<slug>.pdf,
 * /files/collection/<slug>.pdf. Читалка (pdf.js) загружает файл через
 * fetch, а хранилище S3 не отдаёт заголовков CORS — браузер такой
 * запрос из чужого хранилища заблокирует.
 *
 * Адрес файла берётся из API по slug, поэтому произвольные адреса
 * через этот маршрут не скачать. Range передаётся дальше: pdf.js
 * грузит большой файл кусками и показывает первые страницы сразу.
 */

export const dynamic = 'force-dynamic';

const PASS_HEADERS = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

async function fileUrl(kind: string, slug: string): Promise<string | null> {
  if (kind === 'book') return (await getBook(slug))?.fileUrl ?? null;
  if (kind === 'collection') return (await getCollection(slug))?.collection.fileUrl ?? null;
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string; name: string }> },
) {
  const { kind, name } = await params;
  const slug = name.replace(/\.pdf$/, '');
  if (slug === name) notFound();

  const src = await fileUrl(kind, slug);
  if (!src || extFromUrl(src) !== 'pdf') notFound();

  const range = req.headers.get('range');
  const upstream = await fetch(src, {
    headers: range ? { range } : {},
    cache: 'no-store',
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('Файл недоступен', { status: 502 });
  }

  const headers = new Headers({
    'content-type': 'application/pdf',
    // кешируется в браузере, но не общими прокси: адрес постоянный, а файл в админке могут заменить
    'cache-control': 'private, max-age=3600',
    'content-disposition': `inline; filename="${encodeURIComponent(slug)}.pdf"`,
  });
  for (const h of PASS_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
