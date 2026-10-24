import Link from 'next/link';
import ProjectsSearch from '@/components/ProjectsSearch';
import { canSearch, listProjects } from '@/lib/api';

export const metadata = { title: 'Проекты' };

export default async function ProjectsPage() {
  const [projects, searchable] = await Promise.all([listProjects(), canSearch('projects')]);

  return (
    <section className="wrap">
      <div className="sec-head">
        <h2>Проекты</h2>
      </div>

      {projects.length ? (
        <ProjectsSearch enabled={searchable}>
          <div className="toc flush">
            {projects.map((p) => (
              <Link className="toc-item" key={p.slug} href={`/projects/${p.slug}`}>
                <span className="t">
                  <b style={{ fontWeight: 500 }}>{p.title}</b>
                  {p.description && <div className="post-excerpt">{p.description}</div>}
                </span>
              </Link>
            ))}
          </div>
        </ProjectsSearch>
      ) : (
        <div className="empty">Проектов пока нет.</div>
      )}
    </section>
  );
}
