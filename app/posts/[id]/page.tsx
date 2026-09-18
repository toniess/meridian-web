import Link from 'next/link';
import { notFound } from 'next/navigation';
import Attachments from '@/components/Attachments';
import RichText from '@/components/RichText';
import { getPostContext } from '@/lib/api';
import { excerptFrom, parseBody } from '@/lib/content';
import { rusDate } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getPostContext(Number(id));
  if (!context) return { title: 'Запись не найдена' };

  const { post } = context;
  const image = post.attachments.find((a) => a.type === 'image');
  return {
    title: post.title,
    description: excerptFrom(post.body),
    openGraph: { images: image ? [image.fileUrl || image.url] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const context = await getPostContext(postId);
  if (!context) notFound();

  const { post, project, older, newer } = context;

  return (
    <section className="wrap">
      <div className="post-head">
        <div className="post-date" style={{ marginBottom: 14 }}>
          {post.publishedAt && <>{rusDate(post.publishedAt)}{project && ' · '}</>}
          {project && <Link href={`/projects/${project.slug}`}>{project.title}</Link>}
        </div>
        <h1>{post.title}</h1>
      </div>

      <div className="post-body">
        <RichText paras={parseBody(post.body)} />
        <Attachments items={post.attachments} />
      </div>

      {(older || newer) && (
        <nav className="chapter-nav" style={{ maxWidth: '36em', marginLeft: 0 }}>
          {older ? <Link href={`/posts/${older.id}`}>← {older.title}</Link> : <span />}
          {newer ? <Link href={`/posts/${newer.id}`}>{newer.title} →</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
