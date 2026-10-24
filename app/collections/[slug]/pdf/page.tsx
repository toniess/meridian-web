import { notFound } from 'next/navigation';
import PdfFlipbook from '@/components/PdfFlipbook';
import { getCollection } from '@/lib/api';
import { extFromUrl } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);
  return { title: found ? `${found.collection.title} — листать` : 'Сборник не найден' };
}

export default async function CollectionPdfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);
  const file = found?.collection.fileUrl;
  if (!found || !file || extFromUrl(file) !== 'pdf') notFound();

  return (
    <PdfFlipbook
      src={`/files/collection/${slug}.pdf`}
      title={found.collection.title}
      backHref={`/collections/${slug}`}
      storageKey={`collection:${slug}`}
    />
  );
}
