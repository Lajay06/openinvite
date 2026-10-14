/**
 * api/_lib/professionalFeed.js
 *
 * THE LINKED-COUPLE FEED, BUILT FROM AN ALLOWLIST. goals/2026-10-14-professional.md,
 * Privacy and How the link works.
 *
 * A planner sees what the couple chose to share and nothing more. This module
 * never passes a row through: every field in the response is named here, one
 * by one, and copied from the input. A field that is not named cannot leave,
 * however the input rows grow. Guests' emails, phones, mailing addresses, ids,
 * RSVP tokens and every _enc or _hash value are never named, so they never
 * leave, and no switch can change that.
 *
 * The caller (the feed endpoint) does the reading and the decrypting, through
 * the modules that already do it for the couple (my-guests-rsvp, guestPii),
 * and hands this module plain rows. This module only decides what goes out.
 *
 * A link that is not live yields null: no totals, no names, nothing.
 */

/** The couple's switches. On by default, off by default, and the fixed never list. */
export const SHARE_DEFAULTS = {
  totals: true,        // guest count and reply totals
  names: true,         // guest names
  party: true,         // plus-ones and children
  dietary: true,       // dietary needs and allergies
  meals: true,         // meal choices
  tables: true,        // table and seat
  basics: true,        // the wedding date, venue and ceremony time
  schedule: false,
  vendors: false,
  budget: false,
  songs: false,
  // No accessibility switch (owner ruling 2026-10-14): nothing is sent until a
  // dedicated accessibility field exists; Guest.special_requests is not one.
};
export const SHARE_KEYS = Object.keys(SHARE_DEFAULTS);

/** Never shared, no switch. Shown to the couple as a fixed list. */
export const NEVER_SHARED = [
  'Guest emails',
  'Phone numbers',
  'Mailing addresses',
  'Your private notes',
  'Messages',
  'Passwords and payment details',
];

/** Normalize stored switches: only known keys, booleans only, defaults for the rest. */
export function normalizeShares(raw) {
  const out = {};
  for (const k of SHARE_KEYS) out[k] = typeof raw?.[k] === 'boolean' ? raw[k] : SHARE_DEFAULTS[k];
  return out;
}

/**
 * Is a PlannerLink live? Its rows are an append-only event log (request,
 * approve, update, unlink); the newest decides. Only approve or update after
 * an approval is live. A tie in time goes to unlink, the safe side.
 */
const RANK = { unlink: 3, update: 2, approve: 1, request: 0 };
export function latestLinkEvent(rows) {
  const list = (rows || []).filter((r) => r && RANK[r.event_type] !== undefined);
  if (!list.length) return null;
  return list.slice().sort((a, b) => {
    const t = String(b.created_date || '').localeCompare(String(a.created_date || ''));
    return t !== 0 ? t : RANK[b.event_type] - RANK[a.event_type];
  })[0];
}
export function isLinkLive(rows) {
  const latest = latestLinkEvent(rows);
  if (!latest || (latest.event_type !== 'approve' && latest.event_type !== 'update')) return false;
  return (rows || []).some((r) => r.event_type === 'approve');
}

const STATUS = { attending: 'coming', declined: 'not_coming', maybe: 'waiting', pending: 'waiting' };
const str = (v) => (typeof v === 'string' && v.trim() && v.trim() !== '—' ? v.trim() : null);

/**
 * Build the response. `guests` are plain, already-decrypted rows; `wedding`
 * is the couple's WeddingDetails subset. Returns null when the link is not
 * live. Every output key is written here by name.
 */
export function buildLinkedFeed({ linkRows, guests, wedding, extras = {} }) {
  if (!isLinkLive(linkRows)) return null;
  const shares = normalizeShares(latestLinkEvent(linkRows)?.shares);

  const totals = { invited: 0, coming: 0, not_coming: 0, waiting: 0, plus_ones: 0, children: 0 };
  const mealCounts = new Map();
  const dietary = [];
  const rows = [];

  for (const g of guests || []) {
    const status = STATUS[g?.rsvp_status] || 'waiting';
    const child = g?.is_child === true;
    const plusOneComing = g?.plus_one === true && status === 'coming' && g?.plus_one_rsvp_status !== 'declined';
    totals.invited += 1;
    totals[status] += 1;
    if (plusOneComing) totals.plus_ones += 1;
    if (child && status === 'coming') totals.children += 1;

    const meal = str(g?.meal_label);
    if (status === 'coming' && meal) mealCounts.set(meal, (mealCounts.get(meal) || 0) + 1);
    const diet = str(g?.dietary_restrictions);
    const table = str(g?.table_assignment);
    if (status === 'coming' && diet && shares.dietary) {
      dietary.push({ name: shares.names ? str(g?.name) : null, need: diet, table: shares.tables ? table : null });
    }

    const row = { status };
    if (shares.names) row.name = str(g?.name) || 'Guest';
    if (shares.party) {
      row.child = child;
      row.plus_one = g?.plus_one === true;
      if (shares.names && g?.plus_one) row.plus_one_name = str(g?.plus_one_name);
    }
    if (shares.dietary) row.dietary = diet;
    if (shares.meals) row.meal = meal;
    if (shares.tables) row.table = table;
    rows.push(row);
  }

  const out = { shares };
  if (shares.totals) out.totals = totals;
  if (shares.names || shares.dietary || shares.meals || shares.tables || shares.party) out.guests = rows;
  // A list, not a map keyed by meal name, so every key in the response is a fixed, approved one.
  if (shares.meals) out.meals = [...mealCounts].map(([meal, count]) => ({ meal, count }));
  if (shares.dietary) out.dietary = dietary;
  if (shares.basics && wedding) {
    out.wedding = {
      date: str(wedding.weddingDate) || str(wedding.date),
      venue: str(wedding.venueName) || str(wedding.venue),
      ceremony_time: str(wedding.ceremonyTime),
    };
  }
  if (shares.schedule && Array.isArray(extras.schedule)) {
    out.schedule = extras.schedule.map((s) => ({ time: str(s?.time), title: str(s?.title), location: str(s?.location) }));
  }
  if (shares.vendors && Array.isArray(extras.vendors)) {
    out.vendors = extras.vendors.map((v) => ({ category: str(v?.category), name: str(v?.name) }));
  }
  if (shares.budget && extras.budget) {
    out.budget = { total: Number(extras.budget.total) || 0, spent: Number(extras.budget.spent) || 0 };
  }
  if (shares.songs && Array.isArray(extras.songs)) {
    out.songs = extras.songs.map((s) => str(s?.title || s)).filter(Boolean);
  }
  return out;
}

/** The frozen copy a planner keeps after an unlink: the last totals only, no names. */
export function frozenTotals(feed) {
  const t = feed?.totals;
  if (!t) return null;
  return { invited: t.invited, coming: t.coming, not_coming: t.not_coming, waiting: t.waiting, plus_ones: t.plus_ones, children: t.children };
}

/**
 * THE APPROVED KEYS, AT EVERY LEVEL (owner ruling 2026-10-14). The response
 * may carry these keys and no others. A field that is not here fails, whatever
 * it is called, so a new key cannot slip past a list of forbidden names.
 * `[]` means a list of objects with these keys; `'strings'` a list of strings.
 */
export const FEED_SHAPE = {
  shares: Object.fromEntries(SHARE_KEYS.map((k) => [k, true])),
  totals: { invited: true, coming: true, not_coming: true, waiting: true, plus_ones: true, children: true },
  guests: [{ status: true, name: true, child: true, plus_one: true, plus_one_name: true, dietary: true, meal: true, table: true }],
  meals: [{ meal: true, count: true }],
  dietary: [{ name: true, need: true, table: true }],
  wedding: { date: true, venue: true, ceremony_time: true },
  schedule: [{ time: true, title: true, location: true }],
  vendors: [{ category: true, name: true }],
  budget: { total: true, spent: true },
  songs: 'strings',
};

/** Every path in `value` that the shape does not approve. Empty means clean. */
export function keysOutsideAllowlist(value, shape = FEED_SHAPE, path = '') {
  const hits = [];
  if (value === null || value === undefined) return hits;
  if (shape === true) {
    if (typeof value === 'object') hits.push(`${path} (an object where a value belongs)`);
    return hits;
  }
  if (shape === 'strings') {
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) hits.push(`${path} (not a list of strings)`);
    return hits;
  }
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [`${path} (not a list)`];
    value.forEach((v, i) => hits.push(...keysOutsideAllowlist(v, shape[0], `${path}[${i}]`)));
    return hits;
  }
  if (typeof value !== 'object' || Array.isArray(value)) return [`${path} (not an object)`];
  for (const [k, v] of Object.entries(value)) {
    if (!Object.hasOwn(shape, k)) hits.push(`${path}.${k}`);
    else hits.push(...keysOutsideAllowlist(v, shape[k], `${path}.${k}`));
  }
  return hits;
}

/** The second net: any string that looks like an email address. */
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
export function emailShapedValues(value, path = '') {
  const hits = [];
  if (Array.isArray(value)) value.forEach((v, i) => hits.push(...emailShapedValues(v, `${path}[${i}]`)));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) hits.push(...emailShapedValues(v, `${path}.${k}`));
  else if (typeof value === 'string' && EMAIL_VALUE.test(value)) hits.push(`${path} (an email address)`);
  return hits;
}

/**
 * The check the endpoint runs before any response leaves, and the guard
 * proves: no key outside the approved shape, and no email-shaped value.
 */
export function forbiddenInFeed(feed) {
  return [...keysOutsideAllowlist(feed), ...emailShapedValues(feed)];
}
