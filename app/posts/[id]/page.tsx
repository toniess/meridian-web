import Link from 'next/link';
import { notFound } from 'next/navigation';
import Attachments from '@/components/Attachments';
import RichText from '@/components/RichText';
import { getPost, listProjectPosts, listProjects } from '@/lib/api';
import { excerptFrom, parseBody } from '@/lib/content';
import { rusDate } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(Number(id));
  if (!post) return { title: 'Запись не найдена' };
  const image = post.attachments.find((a) => a.type === 'image');
  return {
    title: post.title,
    description: excerptFrom(post.body),
    openGraph: { images: image ? [image.fileUrl || image.url] : undefined },
  };
}

/**
 * В API у записи нет ссылки на проект, поэтому проект ищется перебором.
 * Проектов немного, а ответы кешируются, так что это дешевле, чем кажется.
 */
async function findProjectOf(postId: number) {
  const projects = await listProjects();
  for (const project of projects) {
    const posts = await listProjectPosts(project.slug);
    const i = posts.findIndex((p) => p.id === postId);
    if (i !== -1) {
      return { project, older: posts[i + 1] ?? null, newer: posts[i - 1] ?? null };
    }
  }
  return null;
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const post = await getPost(postId);
  if (!post) notFound();

  const context = await findProjectOf(postId);

  return (
    <section className="wrap">
      <div className="post-head">
        <div className="post-date" style={{ marginBottom: 14 }}>
          {post.publishedAt ? rusDate(post.publishedAt) : 'Черновик'}
          {context && (
            <>
              {' · '}
              <Link href={`/projects/${context.project.slug}`}>{context.project.title}</Link>
            </>
          )}
        </div>
        <h1>{post.title}</h1>
      </div>

      <div className="post-body">
        <RichText paras={parseBody(post.body)} />
        <Attachments items={post.attachments} />
      </div>

      {context && (
        <nav className="chapter-nav" style={{ maxWidth: '36em', marginLeft: 0 }}>
          {context.older ? <Link href={`/posts/${context.older.id}`}>← {context.older.title}</Link> : <span />}
          {context.newer ? <Link href={`/posts/${context.newer.id}`}>{context.newer.title} →</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
