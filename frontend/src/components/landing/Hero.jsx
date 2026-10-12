import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import Calligraphy from './Calligraphy';

gsap.registerPlugin(CustomEase);

// Nib timing for one mark: cubic-bezier(0.16, 1, 0.3, 1), written as CustomEase
// path data because GSAP cannot read a CSS cubic-bezier() string. A confident
// arrival rather than a careful one — the nib is travelling at roughly 6x its
// average speed the instant it touches down and spends the rest of the duration
// settling. For a dot or a detached flourish that is exactly right: a decisive
// tap, then stillness.
CustomEase.create('signature', 'M0,0 C0.16,1 0.3,1 1,1');
const arrivalEase = gsap.parseEase('signature');

// The connected body of the word cannot use that curve. Its front-loading is
// extreme — y(t) = 3t - 3t^2 + t^3 lays half the ink down in the first tenth of
// the time and ~95% by 42%, which is why a stroke reads as finished long before
// its tween is. Across a dot that is a tap; across six connected strokes it would
// fling the first letter past the eye and then crawl through the last four. A run
// with that much writing in it gets a curve with a middle instead: the nib leans
// in once at the top of the word and settles once at the end of it, rather than
// surging and stalling at every stroke boundary.
const writtenEase = gsap.parseEase('power1.inOut');

// Total stroke weight at which a run stops being a mark and becomes writing. The
// connected body sums to 3.18; the next largest run is a single stroke at 0.50.
const GLIDE_WEIGHT = 1.5;

// How long one unit of stroke weight lasts. Ink time is the sum of a run's
// weights times this, and the pen-lift pauses in Calligraphy.jsx sit on top, so
// the sequence reads out at about 2.5 seconds. The connected word alone is 1.27
// of that, which puts the nib near 870px/s on a 640px-wide mark — the speed a
// hand actually signs at. Note this is longer than the sequence it replaced:
// writing the same word at a constant human pace simply takes longer than
// writing it in bursts with dead air between them.
const STROKE_SCALE = 0.4;

// Eases run one way only, and a mask has to lift at the instant its own stroke
// lands — which means inverting the curve. Twenty-four bisections land well
// inside a frame, and this runs once per stroke at mount.
function timeAtReveal(duration, ease, progress) {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 24; n += 1) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < progress) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * duration;
}

export default function Hero() {
  const root = useRef(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const $ = gsap.utils.selector(root.current);
        const ink = $('[data-ink]');
        const pen = $('[data-pen-stroke]');

        // Measure every nib trajectory before writing a single style. Interleaving
        // getTotalLength with gsap.set forces a fresh layout per stroke, and the
        // hitch lands exactly when the writing should be starting.
        const lengths = pen.map(path => path.getTotalLength());

        // Group the strokes into runs. A run is one unbroken movement: a stroke
        // carrying no lift continues the run already under way, and a lift starts
        // a new one. Everything the run needs is gathered here so the sequence
        // below reads as movement rather than as a list of nineteen tween calls.
        const runs = [];
        pen.forEach((path, i) => {
          const lift = Number(path.dataset.lift) || 0;
          if (!runs.length || lift > 0) runs.push({ lift, weight: 0, members: [] });
          const run = runs[runs.length - 1];
          const weight = Number(path.dataset.duration);
          run.weight += weight;
          run.members.push({ path, ink: ink[i], length: lengths[i] });
        });

        pen.forEach((path, i) => gsap.set(path, {
          strokeDasharray: lengths[i], strokeDashoffset: lengths[i], opacity: 0,
        }));

        // Masks go on up front so no letter part shows before its stroke, but each
        // lifts the moment its own stroke lands, so only the strokes still to come
        // stay composited.
        ink.forEach(el => gsap.set(el, { attr: { mask: el.dataset.mask } }));
        gsap.set('.hero-attribution', { opacity: 0, y: 10 });

        const timeline = gsap.timeline({ delay: 0.1 });
        let at = 0;
        runs.forEach((run, r) => {
          const span = run.members.reduce((n, m) => n + m.length, 0);
          const duration = run.weight * STROKE_SCALE;
          const ease = run.weight > GLIDE_WEIGHT ? writtenEase : arrivalEase;
          const { members } = run;
          if (r > 0) at += run.lift;

          // One tween drives the whole run, and the nib's position comes from
          // distance travelled rather than from per-stroke progress. That is what
          // buys a single velocity profile from the first stroke to the last.
          // Giving each stroke its own tween — however heavily overlapped — forces
          // every one of them to decelerate to a stop and start again, and that
          // ripple at each boundary is precisely the pause that read as "part by
          // part" rather than as writing.
          const travelled = { progress: 0 };
          timeline.set(members.map(m => m.path), { opacity: 1 }, at);
          timeline.to(travelled, {
            progress: 1,
            duration,
            ease,
            onUpdate: () => {
              let remaining = travelled.progress * span;
              for (let k = 0; k < members.length; k += 1) {
                const member = members[k];
                const local = gsap.utils.clamp(0, 1, remaining / member.length);
                member.path.style.strokeDashoffset = member.length * (1 - local);
                remaining -= member.length;
              }
            },
          }, at);

          // Each mask lifts the instant its own stroke is drawn out.
          let cumulative = 0;
          members.forEach((member, k) => {
            cumulative += member.length;
            const reveal = k === members.length - 1
              ? duration
              : timeAtReveal(duration, ease, cumulative / span);
            timeline.set(member.ink, { attr: { mask: 'none' } }, at + reveal);
          });

          at += duration;
        });
        timeline.to('.hero-attribution', { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out' }, at + 0.08);

        // Opacity and translation are composited on the GPU, so the backdrop warms
        // in without ever touching the pen's raster budget. Scaling a 68px-blurred
        // layer would force the blur to be re-rasterised every frame, and the
        // writing visibly stutters waiting on it.
        gsap.fromTo('.earth-hue', { opacity: 0, xPercent: -10 }, {
          opacity: 1, xPercent: 0, duration: 2.6, stagger: 0.22, ease: 'sine.out',
        });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return (
    <section ref={root} className="landing-hero" aria-label="Baithak, a project by Echo">
      <div className="earth-field" aria-hidden="true"><div className="earth-hue hue-clay" /><div className="earth-hue hue-wheat" /><div className="earth-hue hue-olive" /></div>
      <div className="hero-mark">
        <h1 className="visually-hidden">Baithak — a place for Punjab’s stories</h1>
        <Calligraphy />
        <p className="hero-attribution">A Project by <span>Echo</span></p>
      </div>
      <div className="hero-foot">
        <p>A place for Punjab’s stories.<br /><span>And the people who carry them.</span></p>
        <a className="scroll-link" href="#our-purpose" aria-label="Come, sit with us — آؤ، رَل کے بہیئے"><span>Come, sit with us<span lang="pa-Arab" dir="rtl">آؤ، رَل کے بہیئے</span></span><svg viewBox="0 0 24 38" aria-hidden="true"><path d="M12 1v33M4 26l8 8 8-8" /></svg></a>
        <p className="punjabi hero-punjabi" lang="pa-Arab" dir="rtl">پنجاب دیاں کہانیاں لئی اک تھاں۔<br /><span>تے اوہناں لوکاں لئی، جو ایہہ کہانیاں سانبھدے نیں۔</span></p>
      </div>
    </section>
  );
}

