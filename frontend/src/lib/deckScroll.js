/**
 * Eased scrolling for the deck.
 *
 * The arrow controls used to call `scrollTo({ behavior: 'smooth' })`, which hands
 * the whole of the timing to the browser: the duration and the curve are fixed,
 * and the curve is not the one the rest of Baithak moves on. A deck that travels
 * a full screen at a time is exactly the case where the curve is worth owning, so
 * this drives the scroll from a requestAnimationFrame loop instead.
 *
 * The curve itself is the same shape as `--ease` in app.css, written out here
 * because a CSS custom property cannot be handed to a JavaScript animation.
 */

/**
 * One axis of a cubic bezier anchored at (0,0) and (1,1), as a polynomial.
 *
 * `a1` and `a2` are the two control points on that axis. The expansion is the
 * standard one: B(t) = 3(1-t)²t·a1 + 3(1-t)t²·a2 + t³.
 */
function coefficients(a1, a2) {
  return [1 - 3 * a2 + 3 * a1, 3 * a2 - 6 * a1, 3 * a1];
}

function evaluate(values, t) {
  const [a, b, c] = values;
  return ((a * t + b) * t + c) * t;
}

/**
 * Finds the `t` whose x lands on `x`, by bisection.
 *
 * Newton's method is the usual choice here and converges faster, but it needs the
 * derivative, and an ease-out curve spends most of its length nearly flat — the
 * derivative approaches zero exactly where the reader is watching the motion
 * settle. Bisection needs only that x(t) is monotonic, which it is whenever the
 * control points sit inside the unit square. Thirty-two halvings resolve to
 * better than a pixel, and the cost is a handful of multiplications per frame.
 */
function solveT(x, values) {
  let low = 0;
  let high = 1;
  let t = x;
  for (let i = 0; i < 32; i += 1) {
    if (evaluate(values, t) > x) high = t;
    else low = t;
    t = (low + high) / 2;
  }
  return t;
}

/** A cubic-bezier easing as `progress → eased progress`, given the four coordinates. */
export function cubicBezier(x1, y1, x2, y2) {
  const xs = coefficients(x1, x2);
  const ys = coefficients(y1, y2);
  return (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    return evaluate(ys, solveT(progress, xs));
  };
}

/** The deck's curve: brisk off the mark, then a long settle. */
export const EASE_DECK = cubicBezier(0.22, 1, 0.36, 1);

const MIN_DURATION = 420;
const MAX_DURATION = 780;
const MS_PER_PIXEL = 0.35;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scrolls `container` to `top` on the deck's curve, returning a way to stop it.
 *
 * The loop writes `scrollTop` sixty times a second and owns the whole animation,
 * so nothing else may claim that scroll position while it runs.
 *
 * The reader can always take the deck back: a wheel, a touch or a press stops the
 * glide where it is, and a free-scrolling deck holds that position.
 */
export function scrollDeck(container, top, { easing = EASE_DECK, duration: requestedDuration, onFinish = () => {} } = {}) {
  if (prefersReducedMotion()) {
    container.scrollTop = top;
    onFinish();
    return () => {};
  }

  const from = container.scrollTop;
  const distance = top - from;
  if (!distance) { onFinish(); return () => {}; }

  const duration = requestedDuration ?? Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.abs(distance) * MS_PER_PIXEL));

  let frame = 0;
  let stopped = false;

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    container.removeEventListener('wheel', stop);
    container.removeEventListener('touchstart', stop);
    container.removeEventListener('pointerdown', stop);
    onFinish();
  }

  function step(now, start) {
    if (stopped) return;
    const progress = Math.min(1, (now - start) / duration);
    container.scrollTop = from + distance * easing(progress);
    if (progress < 1) frame = requestAnimationFrame((next) => step(next, start));
    else stop();
  }

  container.addEventListener('wheel', stop, { passive: true });
  container.addEventListener('touchstart', stop, { passive: true });
  container.addEventListener('pointerdown', stop, { passive: true });
  frame = requestAnimationFrame((now) => step(now, now));

  return stop;
}
