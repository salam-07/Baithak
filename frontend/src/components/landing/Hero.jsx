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
// fling the first letter past the eye and then crawl through the last four.
//
// A run gets a written curve instead: cubic-bezier(0.35, 0.15, 0.35, 1). It leans
// in, then settles for most of its length. The closing sweep is 30% of the word's
// length and used to get 39% of the run's time; this gives it 52% and a long decay
// off the back, so the flourish is the slowest thing in the word rather than the
// fastest.
CustomEase.create('written', 'M0,0 C0.35,0.15 0.35,1 1,1');
const writtenEase = gsap.parseEase('written');

// Total stroke weight at which a run stops being a mark and becomes writing. The
// connected body sums to 3.18; the next largest run is a single stroke at 0.50.
const GLIDE_WEIGHT = 1.5;

// Base pacing, in seconds per unit of stroke weight. Marks and dots use this
// directly, so they keep the tempo they had, and the pen-lift pauses in
// Calligraphy.jsx sit on top of it.
const STROKE_SCALE = 0.4;

// The connected run gets its own, longer pacing. The curve above spends a much
// larger share of the run on the closing sweep, and the body would rush if that
// time came out of its pace — so the run is stretched to pay for it instead.
const GLIDE_SCALE = 0.52;

// How long a mark takes to fade up, as a multiple of its own drawing time. The
// fade outlasts the stroke on purpose: the nib lays the dot down and it is still
// settling into full weight after the pen has moved on.
const MARK_FADE = 1.5;

// How far the earth hues travel on their way in, as a percentage of their own
// width. The first pass ran at 10, which carried even the widest hue less than a
// tenth of the way across the viewport — under the threshold at which a soft wash
// registers as moving at all, so the field arrived without ever appearing to have
// travelled. This is the dial: 30 is three times that arrival.
const HUE_REACH = 30;

// And the same displacement on the other axis, one per hue in DOM order — clay,
// wheat, olive. Horizontal travel alone sends all three along the same vector, so
// the field slides as a single slab; a vertical offset apiece makes the group open
// outward as it settles. Each sign points away from the frame's centre, so a hue is
// displaced further off the edge it is already anchored to and travels inward. Every
// tween below ends at 0, which is the position the CSS already set — the resting
// composition is untouched, only the distance covered to reach it changes.
const HUE_SHEAR = [-16, 18, 14];

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

        // Masks go on up front so no letter part shows before its stroke. Each one
        // comes off in its own time; see `outlines` below.
        ink.forEach(el => gsap.set(el, { attr: { mask: el.dataset.mask } }));
        // Detached marks start clear and fade up; the connected run never does.
        runs.forEach(run => {
          if (run.weight <= GLIDE_WEIGHT) run.members.forEach(m => gsap.set(m.ink, { opacity: 0 }));
        });
        gsap.set('.hero-attribution', { opacity: 0, y: 10 });

        const timeline = gsap.timeline({ delay: 0.1 });

        // When each outline can finally be uncovered, keyed by the outline itself.
        // Two nib strokes often reveal one contour — the last letter's ascender and
        // its closing sweep are separate strokes over a single outline — so both
        // ink elements carry the same `d`. Lifting the first stroke's mask as soon
        // as it lands takes the mask off that shared outline while the second
        // stroke is still to come, and the whole contour, sweep included, appears in
        // one frame. The sweep was never drawn; it was uncovered. So a mask lifts
        // only once every stroke over its outline is done, at the latest of them.
        const outlines = new Map();

        let at = 0;
        runs.forEach((run, r) => {
          const span = run.members.reduce((n, m) => n + m.length, 0);
          const glide = run.weight > GLIDE_WEIGHT;
          const duration = run.weight * (glide ? GLIDE_SCALE : STROKE_SCALE);
          const ease = glide ? writtenEase : arrivalEase;
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

          // Record when this stroke is drawn out. The lift itself waits until the
          // whole timeline is built, because a later run may share the outline.
          let cumulative = 0;
          members.forEach((member, k) => {
            cumulative += member.length;
            const done = at + (k === members.length - 1
              ? duration
              : timeAtReveal(duration, ease, cumulative / span));
            const outline = member.ink.getAttribute('d');
            const held = outlines.get(outline);
            if (held) {
              held.done = Math.max(held.done, done);
              held.nodes.push(member.ink);
            } else {
              outlines.set(outline, { done, nodes: [member.ink] });
            }
          });

          // A detached mark fades up as the nib lays it, so a dot arrives as a
          // softening touch rather than a hard switch. The connected run never
          // needs this: it is one continuous reveal and the masks do all the work.
          if (!glide) {
            timeline.to(members.map(m => m.ink), {
              opacity: 1, duration: duration * MARK_FADE, ease: 'power2.out',
            }, at);
          }

          at += duration;
        });

        // Every landing time is known now, so each mask can come off at the moment
        // its outline is complete — the last stroke over it, not the first.
        outlines.forEach(({ done, nodes }) => {
          timeline.set(nodes, { attr: { mask: 'none' } }, done);
        });

        timeline.to('.hero-attribution', { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out' }, at + 0.08);

        // Opacity and translation are composited on the GPU, so the backdrop warms
        // in without ever touching the pen's raster budget. Scaling a blurred layer
        // would force the blur to be re-rasterised every frame, and the writing
        // visibly stutters waiting on it. Translation stays composited at any
        // distance, so the reach above costs nothing that the first 10% did not.
        //
        // Tripling the distance without touching the duration would have tripled the
        // speed too, and a blurred field moving that fast stops reading as warmth
        // and starts reading as a wipe. The 2.6s that carried 10% is stretched to 3s
        // for 30%: the hues cover three times the ground at roughly 2.6 times the
        // pace, and the stagger widens so the arrival spreads across the writing
        // rather than landing as one event.
        gsap.fromTo('.earth-hue',
          { opacity: 0, xPercent: -HUE_REACH, yPercent: (i) => HUE_SHEAR[i] },
          {
            opacity: 1, xPercent: 0, yPercent: 0, duration: 3, stagger: 0.3, ease: 'sine.out',
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

