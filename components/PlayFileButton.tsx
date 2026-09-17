'use client';

import { useAudio } from './AudioPlayer';

export default function PlayFileButton({
  title,
  subtitle = '',
  src,
  label = 'Слушать',
  className = 'fs',
}: {
  title: string;
  subtitle?: string;
  src: string;
  label?: string;
  className?: string;
}) {
  const { play } = useAudio();
  return (
    <button className={className} onClick={() => play({ title, subtitle, src, duration: null })}>
      {label}
    </button>
  );
}
