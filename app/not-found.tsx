import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap">
      <div className="empty">
        <p>Такой страницы нет — возможно, ссылка устарела.</p>
        <Link className="btn ghost" href="/">На главную</Link>
      </div>
    </section>
  );
}
