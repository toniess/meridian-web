import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AudioProvider } from '@/components/AudioPlayer';
import { usingMockData } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Игорь Глушков — рассказы и проект «Меридиан»',
    template: '%s — Игорь Глушков',
  },
  description:
    'Рассказы и повести Игоря Глушкова: читать онлайн, слушать в озвучке автора, скачать. И рабочий дневник проекта «Меридиан».',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Игорь Глушков',
    images: ['/images/winter.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AudioProvider>
          {usingMockData && (
            <div className="banner">
              <div className="wrap">
                Демо-режим: API_BASE не задан, сайт показывает встроенные тестовые данные.
              </div>
            </div>
          )}
          <Header />
          <main>{children}</main>
          <Footer />
        </AudioProvider>
      </body>
    </html>
  );
}
