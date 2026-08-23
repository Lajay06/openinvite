/**
 * Is this page load a guest-facing wedding site?
 *
 * Guests never signed up for anything, so the product holds as little about
 * them as it can. Telemetry is part of "as little": analytics does not run on
 * their pages at all, and session replay is not sampled there.
 *
 * Evaluated once at module load, from the path. That is sound here because
 * the two worlds never navigate into each other in a single page load: a
 * guest site lives under /w/ and links out to nothing in the dashboard, and a
 * couple reaching /w/ triggers a full document load. If that ever stops being
 * true, this becomes wrong silently -- hence the note.
 */
export function isGuestRoute(pathname) {
  const p = pathname ?? (typeof window === 'undefined' ? '' : window.location.pathname);
  return /^\/w\//.test(p) || p === '/w';
}
