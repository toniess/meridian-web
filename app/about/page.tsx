import Link from 'next/link';

export const metadata = {
  title: 'Об авторе',
  description: 'Игорь Михайлович Глушков — инженер-дорожник из Омска, автор рассказов и повестей.',
};

const FACTS = [
  ['Родился', 'Омск, 1957'],
  ['Образование', 'СибАДИ, 1984'],
  ['Служба', 'Войска ПВО'],
  ['Спорт', 'КМС по плаванию'],
  ['Главный проект', 'Аэропорт «Омск-Фёдоровка»'],
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
              Больше тридцати лет работал в проектировании и строительстве, руководил в омском
              «Мостовике» проектом аэропорта «Омск-Фёдоровка». Многое из того, о чём он пишет, —
              оттуда: вахты, зимники, люди, которые часто совершают настоящие трудовые подвиги.
            </p>
            <p>
              Первый сборник рассказов вышел в 2023 году. Что пишется и снимается сейчас, можно
              скоро увидеть и здесь. Так что будет не скучно и интересно...
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
            <Link className="btn ghost" href="/projects">Проекты</Link>
          </div>
        </div>

        <div className="about-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/author.webp"
            alt="Игорь Глушков зимой на морозе, с заиндевевшей бородой"
            width={760}
            height={819}
          />
        </div>
      </div>
    </section>
  );
}
