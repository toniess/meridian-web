import { notFound } from 'next/navigation';
import ReaderChrome from '@/components/ReaderChrome';
import RichText from '@/components/RichText';
import { getBook, getBookContent, usingMockData } from '@/lib/api';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; part: string }>;
}) {
  const { slug, part } = await params;
  const book = await getBook(slug);
  if (!book) return { title: 'Книга не найдена' };
  const content = await getBookContent(book);
  const current = content.kind === 'text' ? content.parts[Number(part)] : null;
  // у книги из одного файла название части часто совпадает с названием книги
  const part_ = current?.title && current.title !== book.title ? `${current.title} — ` : '';
  return { title: `${part_}${book.title}` };
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string; part: string }>;
}) {
  const { slug, part } = await params;
  const index = Number(part);
  if (!Number.isInteger(index) || index < 0) notFound();

  const book = await getBook(slug);
  if (!book) notFound();

  const content = await getBookContent(book);
  if (content.kind !== 'text') notFound();

  const current = content.parts[index];
  if (!current) notFound();

  // стихи набираются иначе, чем проза: заголовок встаёт по центру над строфами
  const isVerse = current.paragraphs.some((p) => p.type === 'verse');

  return (
    <ReaderChrome
      bookSlug={book.slug}
      bookTitle={book.title}
      parts={content.parts.map((p) => ({ index: p.index, title: p.title }))}
      current={current}
    >
      {usingMockData && (
        <p className="demo-note">
          Это пример текста — так выглядит книга в читалке.
        </p>
      )}
      <article className={isVerse ? 'page page-verse' : 'page'}>
        {current.title && <h2>{current.title}</h2>}
        <RichText paras={current.paragraphs} />
      </article>
    </ReaderChrome>
  );
}
