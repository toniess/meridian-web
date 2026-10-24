import type { MetadataRoute } from 'next';
import { listBooks, listCollections, listProjectPosts, listProjects } from '@/lib/api';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, collections, projects] = await Promise.all([
    listBooks(),
    listCollections(),
    listProjects(),
  ]);

  // текст книги — на её странице, отдельных адресов у частей нет
  const bookUrls = books.map((b) => ({ url: `${base}/books/${b.slug}`, priority: 0.8 }));
  const collectionUrls = collections.map((c) => ({ url: `${base}/collections/${c.slug}`, priority: 0.8 }));

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
    { url: `${base}/projects`, priority: 0.9 },
    { url: `${base}/about`, priority: 0.6 },
    ...collectionUrls,
    ...bookUrls,
    ...projectUrls.flat(),
  ];
}
