'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Сквозной плеер озвучек. Живёт в layout, поэтому переживает переходы
 * между страницами: можно слушать главу и параллельно листать блог.
 *
 * Если у главы нет audioUrl (демо-режим), плеер работает в режиме
 * симуляции — интерфейс полностью рабочий, звука просто нет.
 */

export type Track = {
  title: string;
  subtitle: string;
  src?: string | null;
  duration: number | null;
};

type Ctx = { play: (t: Track) => void; current: Track | null };
const AudioCtx = createContext<Ctx>({ play: () => {}, current: null });

export const useAudio = () => useContext(AudioCtx);

const RATES = [1, 1.25, 1.5, 2];

function fmt(s: number): string {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const simulated = !track?.src;

  const play = useCallback((t: Track) => {
    setTrack(t);
    setTime(0);
    setDur(t.duration ?? 0);
    setPlaying(true);
  }, []);

  // Реальное воспроизведение
  useEffect(() => {
    const a = audioRef.current;
    if (!a || simulated) return;
    a.playbackRate = rate;
    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [playing, rate, track, simulated]);

  // Симуляция, когда файла нет
  useEffect(() => {
    if (!simulated || !playing) return;
    lastRef.current = performance.now();
    const step = () => {
      const now = performance.now();
      setTime((t) => {
        const next = t + ((now - lastRef.current) / 1000) * rate;
        lastRef.current = now;
        if (dur && next >= dur) {
          setPlaying(false);
          return dur;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [simulated, playing, rate, dur]);

  const seek = (ratio: number) => {
    const t = Math.max(0, Math.min(dur, ratio * dur));
    setTime(t);
    if (audioRef.current && !simulated) audioRef.current.currentTime = t;
  };

  const skip = (delta: number) => {
    const t = Math.max(0, Math.min(dur, time + delta));
    setTime(t);
    if (audioRef.current && !simulated) audioRef.current.currentTime = t;
  };

  return (
    <AudioCtx.Provider value={{ play, current: track }}>
      {children}

      <div className="player" data-on={Boolean(track)}>
        <div className="wrap">
          <button
            className="pbtn"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Пауза' : 'Слушать'}
          >
            {playing ? '❙❙' : '▶'}
          </button>

          <div className="ptitle">
            <b>{track?.title ?? ''}</b>
            <span>{track?.subtitle ?? ''}</span>
          </div>

          <button className="pmini" onClick={() => skip(-15)}>−15 с</button>

          <button
            className="ptrack"
            aria-label="Перемотка"
            onClick={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - b.left) / b.width);
            }}
          >
            <i style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }} />
          </button>

          <span className="ptime">{fmt(time)} / {fmt(dur)}</span>

          <button
            className="pmini rate"
            onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          >
            {rate}×
          </button>

          <button
            className="pmini"
            aria-label="Закрыть плеер"
            onClick={() => { setPlaying(false); setTrack(null); }}
          >
            ✕
          </button>
        </div>

        {track?.src && (
          <audio
            ref={audioRef}
            src={track.src}
            preload="metadata"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration || track.duration || 0)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>
    </AudioCtx.Provider>
  );
}
