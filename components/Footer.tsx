import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <span>Игорь Михайлович Глушков</span>
        <Link href="/library">Библиотека</Link>
        <Link href="/meridian">Меридиан</Link>
        <Link href="/about">Об авторе</Link>
        <span className="sp">© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
