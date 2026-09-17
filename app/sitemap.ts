import type { MetadataRoute } from 'next';
import { getBookContent, listBooks, listProjectPosts, listProjects } from '@/lib/api';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, projects] = await Promise.all([listBooks(), listProjects()]);

  const bookUrls = await Promise.all(
    books.map(async (b) => {
      const content = await getBookContent(b);
      const parts = content.kind === 'text' ? content.parts : [];
      return [
        { url: `${base}/books/${b.slug}`, priority: 0.8 },
        ...parts.map((p) => ({ url: `${base}/read/${b.slug}/${p.index}`, priority: 0.5 })),
      ];
    }),
  );

  const projectUrls = await Promise.all(
    projects.map(async (pr) => {
      const posts = await listProjectPosts(pr.slug);
      return [
        { url: `${base}/projects/${pr.slug}`, priority: 0.8 },
        ...posts.map((p) => ({
          url: `${base}/posts/${p.id}`,
          lastModified: p.publishedAt ?? undefined,
          priority: 0.7,
        })),
      ];
    }),
  );

  return [
    { url: base, priority: 1 },
    { url: `${base}/library`, priority: 0.9 },
    { url: `${base}/meridian`, priority: 0.9 },
    { url: `${base}/about`, priority: 0.6 },
    ...bookUrls.flat(),
    ...projectUrls.flat(),
  ];
}
