import { permanentRedirect } from 'next/navigation';

/**
 * Отдельной читалки больше нет: текст открывается прямо на странице книги.
 * Старые ссылки вида /read/<книга>/<часть> ведут туда же, к нужной части.
 */
export default async function ReaderRedirect({
  params,
}: {
  params: Promise<{ slug: string; part: string }>;
}) {
  const { slug, part } = await params;
  const index = Number(part);
  permanentRedirect(
    `/books/${encodeURIComponent(slug)}${Number.isInteger(index) && index > 0 ? `#part-${index}` : ''}`,
  );
}
