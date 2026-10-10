import { notFound } from 'next/navigation';
import BookText from '@/components/BookText';
import Cover from '@/components/Cover';
import PlayFileButton from '@/components/PlayFileButton';
import { ReadNote } from '@/components/ReadMark';
import RichText from '@/components/RichText';
import { getBook, getBookContent, listBooks, usingMockData } from '@/lib/api';
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

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();

  const content = await getBookContent(book);

  return (
    <>
      <section className="wrap">
        <div className="book-hero">
          <div><Cover book={book} /></div>
          <div>
            <h1>{book.title}</h1>

            <div className="spec">
              {book.publishedAt && <span>{rusDate(book.publishedAt)}</span>}
              {content.kind === 'text' && content.parts.length > 1 && (
                <span>{plural(content.parts.length, 'часть', 'части', 'частей')}</span>
              )}
              {content.kind === 'audio' && <span className="has-audio">аудиокнига</span>}
              {content.kind === 'text' && <ReadNote slug={book.slug} />}
              {content.kind === 'download' && <span>{content.ext.toUpperCase()}</span>}
            </div>

            {book.description && <p className="annot">{book.description}</p>}

            {content.kind !== 'text' && (
              <div className="actions">
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
            )}

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
      </section>

      {content.kind === 'text' && (
        <BookText
          slug={book.slug}
          bookTitle={book.title}
          parts={content.parts.map((p) => ({ index: p.index, title: p.title }))}
        >
          {usingMockData && (
            <p className="demo-note">Это пример текста — так выглядит книга на сайте.</p>
          )}
          {content.parts.map((part) => (
            <article
              key={part.index}
              id={`part-${part.index}`}
              // стихи набираются иначе, чем проза: заголовок встаёт по центру над строфами
              className={part.paragraphs.some((p) => p.type === 'verse') ? 'page page-verse' : 'page'}
            >
              {/* у книги из одного файла название части часто повторяет название книги */}
              {part.title && !same(part.title, book.title) && <h2>{part.title}</h2>}
              <RichText paras={part.paragraphs} />
            </article>
          ))}
        </BookText>
      )}
    </>
  );
}
