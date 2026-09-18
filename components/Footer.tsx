import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <Link href="/">Главная</Link>
        <Link href="/library">Библиотека</Link>
        <Link href="/projects">Проекты</Link>
        <Link href="/about">Об авторе</Link>
        <span className="sp">© {new Date().getFullYear()} Игорь Михайлович Глушков</span>
      </div>
    </footer>
  );
}
