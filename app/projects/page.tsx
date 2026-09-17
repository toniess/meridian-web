import Link from 'next/link';
import { listProjects } from '@/lib/api';

export const metadata = { title: 'Проекты' };

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <section className="wrap">
      <div className="sec-head">
        <h2>Проекты</h2>
        <p>Каждый проект — отдельная лента записей</p>
      </div>

      {projects.length ? (
        <div className="toc">
          {projects.map((p) => (
            <Link className="toc-item" key={p.slug} href={`/projects/${p.slug}`}>
              <span className="t">
                <b style={{ fontWeight: 500 }}>{p.title}</b>
                {p.description && <div className="post-excerpt">{p.description}</div>}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">Проектов пока нет.</div>
      )}
    </section>
  );
}
