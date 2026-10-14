import { scrollDeck, cubicBezier } from './deckScroll.js';

const EASE_SETTLE = cubicBezier(0.25, 0.65, 0.3, 1);

// A tall post has a freely readable interval, not just a single snap point.
export function snapTarget(top, height, steps, direction) {
  if (!steps.length) return top;
  for (let i = 0; i < steps.length; i += 1) {
    const start = steps[i].top;
    const end = start + Math.max(0, steps[i].height - height);
    if (top >= start - 1 && top <= end + 1) return top;
    const next = steps[i + 1]?.top;
    if (next !== undefined && top > end && top < next) {
      const threshold = Math.min(height * 0.12, (next - end) / 2);
      if (direction > 0) return top - end >= threshold ? next : end;
      if (direction < 0) return next - top >= threshold ? end : next;
      return top - end < next - top ? end : next;
    }
  }
  return Math.max(0, steps[0].top);
}

/** Native gestures keep their momentum; a short pause gently finishes the move. */
export function attachDeckSnap(container, getSteps) {
  let timer;
  let cancel = () => {};
  let settling = false;
  let held = false;
  let previous = container.scrollTop;
  let direction = 0;
  const schedule = () => {
    clearTimeout(timer);
    if (!held && !settling) timer = setTimeout(settle, 160);
  };
  function settle() {
    if (held || settling) return;
    const top = container.scrollTop;
    const target = snapTarget(top, container.clientHeight, getSteps().filter(Boolean).map(node => ({ top: node.offsetTop, height: node.offsetHeight })), direction);
    if (Math.abs(target - top) < 2) return;
    settling = true;
    cancel = scrollDeck(container, target, { easing: EASE_SETTLE, duration: 620, onFinish: () => {
      settling = false;
      previous = container.scrollTop;
    } });
  }
  function onScroll() {
    const top = container.scrollTop;
    if (!settling && Math.abs(top - previous) > 0.5) direction = Math.sign(top - previous);
    previous = top;
    schedule();
  }
  function interrupt() { clearTimeout(timer); cancel(); }
  function down() { held = true; interrupt(); }
  function up() { held = false; schedule(); }
  function wheel(event) { if (!event.ctrlKey) { interrupt(); schedule(); } }
  container.addEventListener('scroll', onScroll, { passive: true });
  container.addEventListener('wheel', wheel, { passive: true });
  window.addEventListener('pointerdown', down, { passive: true });
  container.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('keydown', interrupt);
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });
  window.addEventListener('touchend', up, { passive: true });
  window.addEventListener('touchcancel', up, { passive: true });
  return () => {
    interrupt();
    container.removeEventListener('scroll', onScroll);
    container.removeEventListener('wheel', wheel);
    window.removeEventListener('pointerdown', down);
    container.removeEventListener('touchstart', down);
    window.removeEventListener('keydown', interrupt);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('touchend', up);
    window.removeEventListener('touchcancel', up);
  };
}
