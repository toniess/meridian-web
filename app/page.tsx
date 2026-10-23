import Link from 'next/link';
import BookCard from '@/components/BookCard';
import HomeShelf, { HeroRead } from '@/components/HomeShelf';
import PostRow from '@/components/PostRow';
import { listBooks, listProjectPosts, listProjects } from '@/lib/api';

export default async function HomePage() {
  const [books, projects] = await Promise.all([listBooks(), listProjects()]);

  // у каждого проекта на главной своя короткая лента; проекты без записей
  // показываем ссылками, чтобы не плодить пустые блоки
  const feeds = await Promise.all(
    projects.map(async (project) => ({ project, posts: await listProjectPosts(project.slug) })),
  );
  const withPosts = feeds.filter((f) => f.posts.length > 0);
  const withoutPosts = feeds.filter((f) => f.posts.length === 0).map((f) => f.project);

  return (
    <>
      <div className="hero">
        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/winter.webp" alt="Игорь Глушков на набережной Иртыша" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-scrim-v" />
        <div className="wrap">
          <div className="hero-inner">
            <h1>Игорь Глушков</h1>
            <p className="hero-lede">
              Более двадцати лет строил дороги, аэропорты, судоверфи и шахты. Теперь пишет о том,
              что повидал за эти годы. Книги, песни можно читать и слушать прямо здесь, а в будущем —
              смотреть фотографии и то, чем он занят в настоящее время.
            </p>
            <div className="hero-actions">
              {books.length > 0 && <HeroRead books={books.map(({ slug, title }) => ({ slug, title }))} />}
              {projects.length > 0 && (
                <Link className="btn ghost" href="/projects">
                  {projects.length === 1 ? projects[0].title : 'Проекты'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="wrap">
        <div className="sec-head">
          <h2>Библиотека</h2>
          <Link href="/library">Все книги</Link>
        </div>
        {books.length ? (
          // прочитанные на главной не показываем — какие скрыть, решает браузер
          <HomeShelf books={books.map((b) => ({ slug: b.slug, node: <BookCard book={b} /> }))} />
        ) : (
          <div className="empty">Книг пока нет — первые появятся здесь.</div>
        )}
      </section>

      {withPosts.map(({ project, posts }) => (
        <section className="wrap" key={project.slug}>
          <div className="sec-head">
            <h2>{project.title}</h2>
            <Link href={`/projects/${project.slug}`}>Все записи</Link>
          </div>
          <div className="feed">
            {posts.slice(0, 3).map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        </section>
      ))}

      {withoutPosts.length > 0 && (
        <section className="wrap">
          <div className="sec-head">
            <h2>{withPosts.length ? 'Другие проекты' : 'Проекты'}</h2>
          </div>
          <div className="toc flush">
            {withoutPosts.map((p) => (
              <Link className="toc-item" key={p.slug} href={`/projects/${p.slug}`}>
                <span className="t">{p.title}</span>
                <span className="dur">записей пока нет</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
