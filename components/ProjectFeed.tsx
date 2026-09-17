import Link from 'next/link';
import PostRow from './PostRow';
import type { Post, Project } from '@/lib/types';

/** Лента одного проекта. Используется и в /meridian, и в /projects/[slug]. */
export default function ProjectFeed({
  project,
  posts,
  others,
}: {
  project: Project;
  posts: Post[];
  others: Project[];
}) {
  return (
    <section className="wrap">
      <div className="sec-head">
        <h2>{project.title}</h2>
        {project.description && <p>{project.description}</p>}
      </div>

      {others.length > 0 && (
        <div className="filters">
          <Link href={`/projects/${project.slug}`} aria-current="page">
            {project.title}
          </Link>
          {others.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              {p.title}
            </Link>
          ))}
        </div>
      )}

      {posts.length ? (
        <div className="feed">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="empty">В этом проекте ещё нет записей.</div>
      )}
    </section>
  );
}
