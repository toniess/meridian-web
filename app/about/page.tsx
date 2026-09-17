import Link from 'next/link';

export const metadata = {
  title: 'Об авторе',
  description: 'Игорь Михайлович Глушков: инженер-дорожник, автор рассказов, автор проекта «Меридиан».',
};

const FACTS = [
  ['Родился', 'Омск, 1957'],
  ['Образование', 'СибАДИ, 1984'],
  ['Служба', 'Войска ПВО'],
  ['Спорт', 'КМС по плаванию'],
  ['Главный проект', 'Аэропорт «Фёдоровка»'],
];

export default function AboutPage() {
  return (
    <section className="wrap">
      <div className="about">
        <div>
          <h1 style={{ marginBottom: 26 }}>Об авторе</h1>

          <div className="post-body" style={{ maxWidth: '34em' }}>
            <p>
              Игорь Михайлович Глушков родился в Омске в 1957 году. В 1984 году окончил СибАДИ,
              служил в войсках ПВО, кандидат в мастера спорта по плаванию.
            </p>
            <p>
              Больше тридцати лет работал в дорожном и аэродромном строительстве, руководил
              проектом аэропорта «Фёдоровка». Почти всё, о чём он пишет, — оттуда: вахты, зимники,
              приёмки, люди, которые держат объект, когда объект уже никому не нужен.
            </p>
            <p>
              Первый сборник рассказов вышел в 2023 году. Параллельно ведёт проект «Меридиан» —
              собирает материалы, документы и съёмки в одну линию.
            </p>
          </div>

          <dl className="facts">
            {FACTS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <div className="actions">
            <Link className="btn" href="/library">Читать книги</Link>
            <Link className="btn ghost" href="/meridian">Дневник «Меридиана»</Link>
          </div>
        </div>

        <div className="about-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/portrait.jpg" alt="Портрет Игоря Глушкова" />
        </div>
      </div>
    </section>
  );
}
