import { notFound } from 'next/navigation';
import PdfFlipbook from '@/components/PdfFlipbook';
import { getBook } from '@/lib/api';
import { extFromUrl } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);
  return { title: book ? `${book.title} — листать` : 'Книга не найдена' };
}

export default async function BookPdfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book?.fileUrl || extFromUrl(book.fileUrl) !== 'pdf') notFound();

  return (
    <PdfFlipbook
      downloadHref={book.fileUrl}
      src={`/files/book/${slug}.pdf`}
      title={book.title}
      backHref={`/books/${slug}`}
      storageKey={`book:${slug}`}
    />
  );
}
