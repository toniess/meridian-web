/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone-сборка нужна для Docker-образа: next собирает минимальный
  // server.js со всеми зависимостями внутри .next/standalone
  output: 'standalone',
  poweredByHeader: false,
  images: {
    // если обложки книг и картинки постов отдаёт бекенд —
    // добавьте сюда его хост, иначе next/image их не пропустит
    remotePatterns: [
      { protocol: 'https', hostname: 'container-meridian.containerapps.ru' },
    ],
  },
};
export default nextConfig;
