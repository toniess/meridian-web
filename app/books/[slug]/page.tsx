import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cover from '@/components/Cover';
import ContinueReading from '@/components/ContinueReading';
import PlayFileButton from '@/components/PlayFileButton';
import { getBook, getBookContent, listBooks } from '@/lib/api';
import { plural, rusDate } from '@/lib/format';

export async function generateStaticParams() {
  const books = await listBooks();
  return books.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);
  return book
    ? { title: book.title, description: book.description.slice(0, 180) }
    : { title: 'Книга не найдена' };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();

  const content = await getBookContent(book);

  return (
    <section className="wrap">
      <div className="book-hero">
        <div><Cover book={book} /></div>
        <div>
          <h1>{book.title}</h1>

          <div className="spec">
            {book.publishedAt && <span>{rusDate(book.publishedAt)}</span>}
            {content.kind === 'text' && (
              <span>{plural(content.parts.length, 'часть', 'части', 'частей')}</span>
            )}
            {content.kind === 'audio' && <span className="has-audio">аудиокнига</span>}
            {content.kind === 'download' && <span>{content.ext.toUpperCase()}</span>}
          </div>

          {book.description && <p className="annot">{book.description}</p>}

          <div className="actions">
            {content.kind === 'text' && (
              <>
                <ContinueReading slug={book.slug} partsCount={content.parts.length} />
                {book.fileUrl && (
                  <a className="btn ghost" href={book.fileUrl} download>Скачать файл</a>
                )}
              </>
            )}

            {content.kind === 'audio' && (
              <>
                <PlayFileButton
                  className="btn"
                  label="Слушать"
                  title={book.title}
                  subtitle="Аудиокнига"
                  src={content.src}
                />
                <a className="btn ghost" href={content.src} download>Скачать</a>
              </>
            )}

            {content.kind === 'download' && (
              <a className="btn" href={content.src} download>
                Скачать {content.ext.toUpperCase()}
              </a>
            )}

            {content.kind === 'none' && (
              <p className="post-excerpt">Книга готовится — читать её пока нельзя.</p>
            )}
          </div>

          {content.kind === 'download' && content.reason === 'format' && (
            <p className="post-excerpt" style={{ marginTop: 18 }}>
              На сайте эта книга не открывается — скачайте файл, он читается любой программой
              для чтения и на телефоне, и на компьютере.
            </p>
          )}

          {content.kind === 'download' && content.reason === 'unavailable' && (
            <p className="post-excerpt" style={{ marginTop: 18 }}>
              Открыть книгу на сайте сейчас не получается. Попробуйте позже или скачайте файл.
            </p>
          )}
        </div>
      </div>

      {content.kind === 'text' && content.parts.length > 1 && (
        <div className="toc">
          {content.parts.map((p) => (
            <Link className="toc-item" key={p.index} href={`/read/${book.slug}/${p.index}`}>
              <span className="n">{p.index + 1}</span>
              <span className="t">{p.title}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
