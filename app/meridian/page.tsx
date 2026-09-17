import ProjectFeed from '@/components/ProjectFeed';
import { getMeridianProject, listProjectPosts, listProjects } from '@/lib/api';

export const metadata = {
  title: 'Меридиан',
  description: 'Рабочий дневник проекта «Меридиан»: тексты, съёмки, документы.',
};

export default async function MeridianPage() {
  const project = await getMeridianProject();
  if (!project) {
    return (
      <section className="wrap">
        <div className="empty">Проект ещё не создан в админке.</div>
      </section>
    );
  }

  const [posts, projects] = await Promise.all([listProjectPosts(project.slug), listProjects()]);
  const others = projects.filter((p) => p.slug !== project.slug);

  return <ProjectFeed project={project} posts={posts} others={others} />;
}
