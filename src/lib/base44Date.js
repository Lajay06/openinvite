// Base44 returns created_date/updated_date as e.g. "2026-07-20T00:21:06.570000"
// — a real UTC instant, but with no "Z"/offset suffix. JS's Date constructor
// treats a suffix-less timestamp as LOCAL time, so parsing it directly is
// silently wrong by the viewer's UTC offset (confirmed empirically: a
// notification created seconds ago showed "10 hours ago" for an AEST
// browser). Always parse Base44 timestamps through this helper instead of
// `new Date(str)` directly.
export function parseBase44Date(value) {
  if (!value) return null;
  return new Date(/[Zz]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}
