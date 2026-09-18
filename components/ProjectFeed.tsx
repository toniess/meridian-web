import PostRow from './PostRow';
import type { Post, Project } from '@/lib/types';

/** Лента одного проекта. */
export default function ProjectFeed({ project, posts }: { project: Project; posts: Post[] }) {
  return (
    <section className="wrap">
      <div className="sec-head">
        <h2>{project.title}</h2>
        {project.description && <p>{project.description}</p>}
      </div>

      {posts.length ? (
        <div className="feed">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="empty">Записей пока нет — они появятся здесь.</div>
      )}
    </section>
  );
}
