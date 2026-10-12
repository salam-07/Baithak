import { useId } from 'react';
import glyphs from './logo-paths.json';

// Centerlines follow the Qamri nib, not the outlines. Each mask belongs to
// its own letter part, preventing nearby dots and flourishes appearing early.
//
// `t` weights how long a stroke takes to write. `lift` is the pause before it,
// where the nib comes off the paper. A lift of zero means the nib stayed down,
// so the stroke continues the motion already under way — the five baseline
// strokes and the final sweep carry one another with gaps of only 30 to 50
// units, and reading that as a single run is what makes the connected body of
// the word one sweep instead of a row of separate marks. Everything else is a
// genuine break: the three dots, the mark above, and the detached flourishes.
const strokes = [
  { g: 4, c: [0], d: 'M3915 -635 C3885 -460 4060 -345 4010 -200 Q3990 -75 3870 -80 L3760 -80', w: 205, t: 0.55, lift: 0 },
  { g: 3, c: [1], d: 'M3810 -80 Q3690 -55 3590 -190 Q3500 -65 3320 -80', w: 205, t: 0.34, lift: 0 },
  { g: 2, c: [0], d: 'M3360 -80 Q3215 -55 3140 -190 Q3055 -70 2880 -80', w: 205, t: 0.34, lift: 0 },
  { g: 1, d: 'M2920 -80 L2670 -80 C2530 -80 2480 190 2645 295 C2885 430 2780 160 2660 100 C2440 -15 2505 -285 2755 -490 Q2810 -255 2620 -135 Q2540 -75 2380 -80', w: 185, t: 0.85, lift: 0 },
  { g: 0, c: [1], d: 'M2410 -80 Q2210 -45 2190 -310 L2160 -1130 L2175 -1290', w: 190, t: 0.45, lift: 0 },
  // The long sweep starts back down the ascender the previous stroke just drew,
  // so the nib never really leaves the letter even though the centreline jumps.
  { g: 0, c: [1], d: 'M2190 -250 Q1910 -35 1270 -40 C750 -20 230 -80 0 -340', w: 190, t: 0.65, lift: 0 },
  { g: 0, c: [2], d: 'M2745 -1830 Q2610 -1830 2510 -1720 L1900 -1240 L1710 -1145', w: 180, t: 0.5, lift: 0.09 },
  { g: 0, c: [0], d: 'M1390 -855 Q1230 -650 1350 -620 C1560 -585 1390 -450 1115 -370', w: 170, t: 0.4, lift: 0.07 },
  { g: 2, c: [1, 2], d: 'M2948 -800 L2970 -500 Q2820 -425 2800 -475', w: 65, t: 0.18, lift: 0.08 },
  { g: 2, c: [1, 2], d: 'M2970 -500 Q3140 -635 3190 -510 Q3110 -415 2820 -470', w: 65, t: 0.22, lift: 0 },
  // The dots keep a clear beat. They are short enough to be over before the eye
  // registers them, so the pause is what makes them read as separate touches.
  { g: 4, c: [1], d: 'M3930 220 L3990 300', w: 165, t: 0.14, lift: 0.12 },
  { g: 3, c: [0], d: 'M3640 205 L3725 290', w: 190, t: 0.12, lift: 0.11 },
  { g: 3, c: [0], d: 'M3430 245 L3540 340', w: 190, t: 0.12, lift: 0.11 },
];

export default function Calligraphy() {
  const id = useId().replaceAll(':', '');
  return (
    <svg className="calligraphy" viewBox="-65 -1940 4220 2460" role="img" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>بیٹھک — Baithak</title>
      <defs>
        {strokes.map((s, i) => (
          <mask key={i} id={`${id}-${i}`} maskUnits="userSpaceOnUse" x="-100" y="-2000" width="4400" height="2700">
            <path data-pen-stroke data-duration={s.t} data-lift={s.lift} d={s.d} fill="none" stroke="white" strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />
          </mask>
        ))}
      </defs>
      {strokes.map((s, i) => (
        <path key={i} data-ink d={s.c ? s.c.map(c => glyphs[s.g].contours[c].d).join(' ') : glyphs[s.g].d} fill="currentColor" data-mask={`url(#${id}-${i})`} mask="none" />
      ))}
    </svg>
  );
}
