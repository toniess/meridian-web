import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cover from '@/components/Cover';
import { ReadNote } from '@/components/ReadMark';
import { getCollection, listCollections } from '@/lib/api';
import { AUDIO_EXT, extFromUrl } from '@/lib/content';
import { plural, rusDate } from '@/lib/format';

export async function generateStaticParams() {
  const collections = await listCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);
  return found
    ? { title: found.collection.title, description: found.collection.description.slice(0, 180) }
    : { title: 'Сборник не найден' };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);
  if (!found) notFound();

  const { collection, books } = found;
  const ext = collection.fileUrl ? extFromUrl(collection.fileUrl) : '';

  return (
    <section className="wrap">
      <div className="book-hero">
        <div><Cover book={collection} /></div>
        <div>
          <div className="from-collection">Сборник</div>
          <h1>{collection.title}</h1>

          <div className="spec">
            {collection.publishedAt && <span>{rusDate(collection.publishedAt)}</span>}
            <span>{plural(books.length, 'рассказ', 'рассказа', 'рассказов')}</span>
            {ext && <span>{ext.toUpperCase()}</span>}
          </div>

          {collection.description && <p className="annot">{collection.description}</p>}

          {collection.fileUrl && (
            <div className="actions">
              {ext === 'pdf' && (
                <Link className="btn" href={`/collections/${collection.slug}/pdf`}>Листать</Link>
              )}
              <a
                className={ext === 'pdf' ? 'btn ghost' : 'btn'}
                href={collection.fileUrl}
                download
                data-umami-event="Скачивание"
                data-umami-event-book={collection.title}
                data-umami-event-format={AUDIO_EXT.includes(ext) ? 'аудио' : ext}
              >
                Скачать {ext === 'pdf' ? 'PDF' : 'файл'}
              </a>
            </div>
          )}
        </div>
      </div>

      {books.length > 0 && (
        <nav className="toc" aria-label="Рассказы сборника">
          {books.map((b, i) => (
            <Link className="toc-item" key={b.slug} href={`/books/${b.slug}`}>
              <span className="n">{i + 1}</span>
              <span className="t">
                {b.title.replace(/\s+/g, ' ')}
                {b.description && <div className="post-excerpt">{b.description}</div>}
              </span>
              <ReadNote slug={b.slug} />
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
