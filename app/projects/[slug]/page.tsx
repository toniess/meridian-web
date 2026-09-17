import { notFound } from 'next/navigation';
import ProjectFeed from '@/components/ProjectFeed';
import { getProject, listProjectPosts, listProjects } from '@/lib/api';

export async function generateStaticParams() {
  const projects = await listProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  return project
    ? { title: project.title, description: project.description.slice(0, 180) }
    : { title: 'Проект не найден' };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const [posts, projects] = await Promise.all([listProjectPosts(slug), listProjects()]);
  return <ProjectFeed project={project} posts={posts} others={projects.filter((p) => p.slug !== slug)} />;
}
