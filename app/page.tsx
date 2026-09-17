import Link from 'next/link';
import BookCard from '@/components/BookCard';
import PostRow from '@/components/PostRow';
import { getMeridianProject, listBooks, listProjectPosts } from '@/lib/api';

export default async function HomePage() {
  const [books, project] = await Promise.all([listBooks(), getMeridianProject()]);
  const posts = project ? await listProjectPosts(project.slug) : [];
  const lead = books[0];

  return (
    <>
      <div className="hero">
        <div className="hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/winter.jpg" alt="Игорь Глушков на набережной Иртыша" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-scrim-v" />
        <div className="wrap">
          <div className="hero-inner">
            <h1>Игорь Глушков</h1>
            <p className="hero-lede">
              Тридцать лет строил дороги и аэропорты, теперь записывает то, что за эти годы видел.
              Здесь можно читать и слушать рассказы, а также следить за проектом «Меридиан».
            </p>
            <div className="hero-actions">
              {lead && <Link className="btn" href={`/books/${lead.slug}`}>Читать «{lead.title}»</Link>}
              <Link className="btn ghost" href="/meridian">Что такое «Меридиан»</Link>
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
          <div className="grid-books">
            {books.slice(0, 4).map((b) => <BookCard key={b.slug} book={b} />)}
          </div>
        ) : (
          <div className="empty">Книги ещё не опубликованы.</div>
        )}
      </section>

      {project && (
        <section className="wrap">
          <div className="sec-head">
            <h2>{project.title}</h2>
            <Link href="/meridian">Все записи</Link>
          </div>
          {posts.length ? (
            <div className="feed">
              {posts.slice(0, 3).map((p) => <PostRow key={p.id} post={p} />)}
            </div>
          ) : (
            <div className="empty">Первая запись появится здесь.</div>
          )}
        </section>
      )}
    </>
  );
}
