import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NavProgress from '@/components/NavProgress';
import { THEME_SCRIPT } from '@/lib/theme';
import { AudioProvider } from '@/components/AudioPlayer';
import { listProjects, usingMockData } from '@/lib/api';
import { UMAMI_SRC, UMAMI_WEBSITE_ID } from '@/lib/analytics';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Игорь Глушков — книги и проекты',
    template: '%s — Игорь Глушков',
  },
  description:
    'Рассказы и повести Игоря Глушкова. Их можно читать прямо на сайте, слушать в озвучке автора или скачать файлом. Здесь же — записи о проектах, которыми он занимается.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Игорь Глушков',
    images: ['/images/winter.jpg'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const projects = await listProjects();

  return (
    // data-theme ставит скрипт до гидратации — React не должен на это ругаться
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* useSearchParams внутри требует Suspense, иначе страницы перестанут быть статическими */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <AudioProvider>
          {usingMockData && (
            <div className="banner">
              <div className="wrap">
                Демонстрационный режим: вместо настоящих книг и записей показаны примеры.
              </div>
            </div>
          )}
          <Header projects={projects} />
          <main>{children}</main>
          <Footer />
        </AudioProvider>
        {/* data-domains: считаем только боевой адрес — localhost и адрес
            контейнера в статистику не попадают */}
        <Script
          src={UMAMI_SRC}
          data-website-id={UMAMI_WEBSITE_ID}
          data-domains={new URL(siteUrl).hostname}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
