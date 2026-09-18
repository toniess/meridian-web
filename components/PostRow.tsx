import Link from 'next/link';
import { excerptFrom } from '@/lib/content';
import { rusDate } from '@/lib/format';
import type { Post } from '@/lib/types';

export default function PostRow({ post }: { post: Post }) {
  const thumb = post.attachments.find((a) => a.type === 'image');
  const thumbSrc = thumb?.fileUrl || thumb?.url || null;
  const excerpt = excerptFrom(post.body);
  // у коротких записей текст совпадает с заголовком — повторять его незачем
  const showExcerpt = excerpt && excerpt.replace(/…$/, '') !== post.title.replace(/…$/, '');

  return (
    <Link className="post-row" href={`/posts/${post.id}`} data-dated={Boolean(post.publishedAt)}>
      <div className="post-date">{post.publishedAt ? rusDate(post.publishedAt) : ''}</div>
      <div>
        <h3>{post.title}</h3>
        {showExcerpt && <p className="post-excerpt">{excerpt}</p>}
        {post.attachments.length > 0 && (
          <span className="kind">
            <i />
            {describeAttachments(post)}
          </span>
        )}
      </div>
      {thumbSrc ? (
        <div className="post-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbSrc} alt="" loading="lazy" />
        </div>
      ) : (
        <div />
      )}
    </Link>
  );
}

function describeAttachments(post: Post): string {
  const n = (t: string) => post.attachments.filter((a) => a.type === t).length;
  const bits: string[] = [];
  const images = n('image');
  const videos = n('video_link') + n('video_file');
  const docs = n('document');
  const links = n('link');

  if (images) bits.push(images === 1 ? 'фото' : `${images} фото`);
  if (videos) bits.push('видео');
  if (docs) bits.push(docs === 1 ? 'документ' : `${docs} документа`);
  if (links) bits.push('ссылки');
  return bits.join(', ');
}
