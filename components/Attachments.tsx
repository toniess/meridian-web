import { AUDIO_EXT, extFromUrl, hostOf, videoEmbed } from '@/lib/content';
import PlayFileButton from './PlayFileButton';
import type { Attachment } from '@/lib/types';

/**
 * Вложения поста. Пять типов из API: image, video_file, video_link,
 * document, link. Аудиофайлы приходят как video_file — отличаем по
 * расширению и отдаём в сквозной плеер, а не в тег video.
 */
export default function Attachments({ items }: { items: Attachment[] }) {
  if (!items.length) return null;

  return (
    <>
      {items.map((a) => {
        const src = a.fileUrl || a.url;
        if (!src) return null;

        switch (a.type) {
          case 'image':
            return (
              <figure key={a.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={a.caption} loading="lazy" />
                {a.caption && <figcaption>{a.caption}</figcaption>}
              </figure>
            );

          case 'video_file': {
            const ext = extFromUrl(src);
            if (AUDIO_EXT.includes(ext)) {
              return (
                <div className="filecard" key={a.id}>
                  <span className="ext">аудио</span>
                  <span className="fn">{a.caption || 'Запись'}</span>
                  <PlayFileButton title={a.caption || 'Запись'} src={src} />
                </div>
              );
            }
            return (
              <figure key={a.id}>
                <video controls preload="metadata" src={src} style={{ width: '100%', borderRadius: 'var(--radius)' }} />
                {a.caption && <figcaption>{a.caption}</figcaption>}
              </figure>
            );
          }

          case 'video_link': {
            const embed = videoEmbed(a.url);
            if (!embed) {
              return (
                <a className="filecard" key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
                  <span className="ext">видео</span>
                  <span className="fn">{a.caption || a.url}</span>
                  <span className="fs">{hostOf(a.url)}</span>
                </a>
              );
            }
            return (
              <div className="embed" key={a.id}>
                <iframe
                  src={embed.src}
                  title={a.caption || embed.provider}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
                <div className="embed-meta">
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {a.caption || 'Смотреть'}
                  </a>
                  <span>{embed.provider}</span>
                </div>
              </div>
            );
          }

          case 'document': {
            const ext = extFromUrl(src) || 'файл';
            return (
              <a className="filecard" key={a.id} href={src} target="_blank" rel="noopener noreferrer">
                <span className="ext">{ext}</span>
                <span className="fn">{a.caption || 'Документ'}</span>
                <span className="fs">скачать</span>
              </a>
            );
          }

          case 'link':
            return (
              <a className="filecard" key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
                <span className="ext">ссылка</span>
                <span className="fn">{a.caption || a.url}</span>
                <span className="fs">{hostOf(a.url)}</span>
              </a>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
