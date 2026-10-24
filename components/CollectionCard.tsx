import Link from 'next/link';
import Cover from './Cover';
import { plural } from '@/lib/format';
import type { Collection } from '@/lib/types';

export default function CollectionCard({ collection }: { collection: Collection }) {
  const year = collection.publishedAt?.slice(0, 4);
  return (
    <Link className="book-card collection-card" href={`/collections/${collection.slug}`}>
      <div className="cover-wrap">
        <Cover book={collection} />
      </div>
      <h3>{collection.title}</h3>
      <div className="book-meta">
        <span>{plural(collection.booksCount, 'рассказ', 'рассказа', 'рассказов')}</span>
        {year && <span>{year}</span>}
      </div>
    </Link>
  );
}
