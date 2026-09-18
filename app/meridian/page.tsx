import { redirect } from 'next/navigation';
import { getMeridianProject } from '@/lib/api';

/**
 * Раздела «Меридиан» больше нет: проекты стоят в верхней строке наравне
 * с библиотекой. Адрес оставлен, чтобы старые ссылки не ломались.
 */
export default async function MeridianPage() {
  const project = await getMeridianProject();
  redirect(project ? `/projects/${project.slug}` : '/projects');
}
