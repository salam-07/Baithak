import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// A story passes from one voice to another: paired headings come together,
// rules carry the eye onward, and the cultural connections draw as you read.
// Whole Shahmukhi phrases stay intact so their shaping is never disturbed.
export default function useLandingMotion(root) {
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 601px)' }, ({ conditions }) => {
      if (!conditions.motion) return;
      const context = gsap.context(() => {
        const $ = gsap.utils.selector(root);
        const distance = conditions.desktop ? 48 : 24;
        const enter = (trigger, start = 'top 86%') => ({ trigger, start, once: true });

        gsap.to('.hero-mark', {
          yPercent: -15, opacity: 0.3, ease: 'none',
          scrollTrigger: { trigger: '.landing-hero', start: 'top top', end: 'bottom 25%', scrub: 0.7 },
        });
        gsap.from('.purpose-heading h2', {
          y: distance, clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.out',
          scrollTrigger: enter('.purpose-heading'),
        });
        gsap.from('.purpose-heading .punjabi', {
          x: distance, opacity: 0.25, duration: 1.15, ease: 'expo.out',
          scrollTrigger: enter('.purpose-heading .punjabi'),
        });
        gsap.from('.purpose-copy', {
          '--rule-progress': 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: enter('.purpose-copy'),
        });

        const invitation = gsap.timeline({ scrollTrigger: {
          trigger: '.invitation', start: 'top 92%', end: 'center 45%', scrub: 0.7,
        } });
        invitation.from('.invitation-script', { scale: 0.86, y: 35, transformOrigin: '50% 60%', ease: 'none' }, 0)
          .from('.invitation-line', { scaleY: 0, transformOrigin: 'top', ease: 'none' }, 0.2);
        gsap.from('.invitation p', { y: 18, opacity: 0, duration: 0.8, ease: 'expo.out', scrollTrigger: enter('.invitation p', 'top 92%') });

        const heading = gsap.timeline({ scrollTrigger: enter('.section-heading') });
        heading.from('.section-heading h2', { x: -distance, opacity: 0.2, duration: 1, ease: 'expo.out' })
          .from('.section-intro', { x: distance, opacity: 0.25, duration: 1, ease: 'expo.out' }, 0.12);
        $('.feature-row').forEach(row => {
          const timeline = gsap.timeline({ scrollTrigger: enter(row) });
          timeline.from(row, { '--rule-progress': 0, duration: 0.85, ease: 'power2.inOut' })
            .from(row.querySelector('.feature-title'), { y: 30, opacity: 0.25, duration: 0.85, ease: 'expo.out' }, 0.12)
            .from(row.querySelector('.feature-copy'), { y: 18, opacity: 0.4, duration: 0.85, ease: 'expo.out' }, 0.24);
        });

        const connections = $('.connection-thread');
        const endpoints = $('.connection-source');
        const draw = conditions.desktop ? { scaleX: 0, transformOrigin: 'left' } : { scaleY: 0, transformOrigin: 'top' };
        gsap.timeline({ scrollTrigger: enter('.word-connection', 'top 78%') })
          .from(endpoints[0], { opacity: 0.25, duration: 0.35 })
          .from(connections[0], { ...draw, duration: 0.55, ease: 'power2.inOut' }, 0.1)
          .from('.connection-word', { y: 16, scale: 0.9, opacity: 0.2, duration: 0.65, ease: 'expo.out' }, 0.4)
          .from(connections[1], { ...draw, duration: 0.55, ease: 'power2.inOut' }, 0.75)
          .from(endpoints[1], { opacity: 0.2, y: 10, duration: 0.5, ease: 'expo.out' }, 1.05);

        gsap.from('.promise-inner > div:first-child', {
          y: 42, opacity: 0.25, duration: 1.1, ease: 'expo.out', scrollTrigger: enter('.promise-inner'),
        });
        gsap.from('.promise-copy', {
          '--rule-progress': 0, y: 22, opacity: 0.4, duration: 1, ease: 'expo.out', scrollTrigger: enter('.promise-copy'),
        });
        gsap.timeline({ scrollTrigger: enter('.closing', 'top 78%') })
          .from('.closing > .punjabi', { x: -distance, y: 18, opacity: 0.15, duration: 1.2, ease: 'expo.out' })
          .from('.closing > div', { x: distance, y: 18, opacity: 0.2, duration: 1.2, ease: 'expo.out' }, 0.15);
      }, root);
      return () => context.revert();
    });
    // Refresh after the local fonts settle; do not touch a disposed component.
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => { disposed = true; media.revert(); };
  }, [root]);
}
