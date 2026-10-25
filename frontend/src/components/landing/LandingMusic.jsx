import { useEffect, useRef, useState } from 'react';

export default function LandingMusic() {
  const audio = useRef(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const track = audio.current;
    track.volume = 0.12;
    const start = () => {
      if (!userPaused.current && track.paused) track.play().catch(() => {});
    };
    const onGesture = event => {
      if (event.target.closest?.('.landing-music')) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      start();
    };
    start();
    document.addEventListener('click', onGesture);
    document.addEventListener('keydown', onGesture);
    return () => {
      document.removeEventListener('click', onGesture);
      document.removeEventListener('keydown', onGesture);
      track.pause();
    };
  }, []);

  function toggle() {
    const track = audio.current;
    if (!track.paused) {
      userPaused.current = true;
      track.pause();
    } else {
      userPaused.current = false;
      track.play().catch(() => {});
    }
  }

  const label = playing ? 'Pause music / موسیقی روکو' : 'Play music / موسیقی چلاؤ';
  return <>
    <audio ref={audio} src="/bg.mp3" loop preload="none"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} />
    <button className="landing-music" type="button" onClick={toggle} aria-label={label} title={label}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 4 6 8H3v8h3l5 4z" />
        {playing ? <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /> : <path d="m16 9 6 6m0-6-6 6" />}
      </svg>
    </button>
  </>;
}
