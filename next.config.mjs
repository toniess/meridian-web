/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone-сборка нужна для Docker-образа: next собирает минимальный
  // server.js со всеми зависимостями внутри .next/standalone
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Побывав на сайте по HTTPS, браузер дальше сам ходит только по HTTPS,
        // даже если набрать http:// — шлюз Cloud.ru такой редирект делать не умеет.
        // По http:// браузеры этот заголовок игнорируют, так что локально он не мешает.
        source: '/:path*',
        headers: [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }],
      },
    ];
  },
  images: {
    // если обложки книг и картинки постов отдаёт бекенд —
    // добавьте сюда его хост, иначе next/image их не пропустит
    remotePatterns: [
      { protocol: 'https', hostname: 'container-meridian.containerapps.ru' },
    ],
  },
};
export default nextConfig;
