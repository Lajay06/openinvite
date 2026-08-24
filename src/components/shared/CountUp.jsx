/**
 * CountUp — a dashboard stat number. Renders its value INSTANTLY.
 *
 * It used to animate 0 -> `to` over 1200ms with requestAnimationFrame. That is
 * gone, and the name is kept only because 16 files call it; it counts nothing
 * up any more.
 *
 * WHY IT WENT. The animation cost more than it bought:
 *
 *   1. It was a correctness hazard. The surrounding effects re-render these
 *      pages several times within about a second of data landing, and every
 *      re-fire restarted the animation from zero, so the number could get
 *      stuck near 0 and never arrive. That was patched twice -- a guard on
 *      `to` not having changed, then a setTimeout safety net for throttled
 *      tabs where rAF stalls entirely. Two guards defending an effect whose
 *      only job was decoration.
 *
 *   2. It made every stat unverifiable for 1.2 seconds. Any screenshot or DOM
 *      assertion taken before the animation settled read a number that was not
 *      the real one, so numeric verification had to either sleep past the
 *      window or be quietly untrustworthy. "Screenshots lie for 1.2 seconds"
 *      shadowed every numeric check since the budget work. A stat that equals
 *      its source at first paint is simply checkable.
 *
 *   3. It never honoured prefers-reduced-motion. There was no branch for it,
 *      so a visitor who had asked the OS for less motion got the animation
 *      anyway, on every stat, on every dashboard page.
 *
 * The prop surface is unchanged apart from `duration`, which no call site ever
 * passed and which now means nothing: `to` plus optional `format`, or
 * `prefix`/`suffix`.
 *
 * `to` is guarded because these values arrive from live queries and are
 * undefined on the first render. The old component showed 0 until data landed;
 * this preserves that exactly, rather than painting "NaN" or "undefined".
 */
export default function CountUp({ to, format, prefix = "", suffix = "" }) {
  const value = Number.isFinite(to) ? to : 0;
  if (format) return <>{format(value)}</>;
  return <>{prefix}{value}{suffix}</>;
}
