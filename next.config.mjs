/**
 * Content-Security-Policy. Пока только Report-Only: браузер ничего не
 * блокирует, а нарушения шлёт на /csp-report (видны в логах контейнера).
 * Когда пару недель там будет пусто, ключ меняется на Content-Security-Policy.
 *
 * 'unsafe-inline' в script-src нужен самому Next.js (встроенные скрипты RSC)
 * и скрипту темы. Строже — только через nonce, а nonce делает все страницы
 * динамическими. Внедрённый при взломе <script src="data:…"> и его запросы
 * в блокчейн эта политика и так отсекает: data: и чужие адреса не разрешены.
 */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // next dev использует eval для hot reload
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // картинки и аудио к постам бекенд может отдавать с любого хоста
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self'",
  // видео в постах — см. videoEmbed в lib/content.ts
  'frame-src https://www.youtube-nocookie.com https://rutube.ru https://vk.com https://dzen.ru https://zen.yandex.ru',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'report-uri /csp-report',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone-сборка нужна для Docker-образа: next собирает минимальный
  // server.js со всеми зависимостями внутри .next/standalone
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Побывав на сайте по HTTPS, браузер дальше сам ходит только по HTTPS,
          // даже если набрать http:// — шлюз Cloud.ru такой редирект делать не умеет.
          // По http:// браузеры этот заголовок игнорируют, так что локально он не мешает.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // эти три сейчас ставит и шлюз, но сайт не должен от него зависеть
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
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
