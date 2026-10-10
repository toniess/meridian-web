import PostRow from './PostRow';
import SearchList from './SearchList';
import { parseBody } from '@/lib/content';
import { plural } from '@/lib/format';
import { normSearch } from '@/lib/search';
import type { Post, Project } from '@/lib/types';

/**
 * Текст записи для поиска. Целиком тексты весят сотни килобайт, поэтому в
 * браузер уходит только набор слов записи — для поиска этого достаточно.
 */
function searchText(post: Post): string {
  const body = parseBody(post.body)
    .map((p) => (p.type === 'verse' ? p.lines.join(' ') : p.text))
    .join(' ');
  const captions = post.attachments.map((a) => a.caption).join(' ');
  const words = normSearch(`${post.title} ${body} ${captions}`)
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .split(' ')
    .filter(Boolean);
  return [...new Set(words)].join(' ');
}

/** Лента одного проекта с поиском по записям. */
export default function ProjectFeed({ project, posts }: { project: Project; posts: Post[] }) {
  const note = project.description || plural(posts.length, 'запись', 'записи', 'записей');

  return (
    <section className="wrap">
      {posts.length ? (
        <SearchList
          className="feed"
          placeholder="Поиск по записям"
          label="Поиск по записям проекта"
          title={project.title}
          note={note}
          items={posts.map((p) => ({ key: p.id, text: searchText(p), node: <PostRow post={p} /> }))}
        />
      ) : (
        <>
          <div className="sec-head">
            <h2>{project.title}</h2>
            {note && <p>{note}</p>}
          </div>
          <div className="empty">Записей пока нет — они появятся здесь.</div>
        </>
      )}
    </section>
  );
}
