/**
 * src/lib/professionalGuests.js
 *
 * GUESTS FOR A PLANNER: the panel's figures, the caterer sheet, and the
 * standalone importer. goals/2026-10-14-professional.md, What a professional
 * gets, 4, and How the link works.
 *
 * The importer reads names, dietary needs, meals and tables from the couple's
 * spreadsheet or another RSVP site. It drops every email, phone and address
 * column, and says which ones it dropped. No contact detail is ever kept.
 */

/** RFC 4180-ish: quotes, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/** Headers that are contact details. Matched loosely, because every RSVP site spells them its own way. */
export const CONTACT_HEADER = /e-?mail|phone|mobile|cell|tel\b|address|street|suburb|city|town|zip|post\s*code|postal|state|province|country|whats\s*app|instagram/i;

const FIELD_HEADERS = {
  name: /^(full\s*)?name$|^guest(\s*name)?$/i,
  first: /^first(\s*name)?$|^given/i,
  last: /^last(\s*name)?$|^surname|^family\s*name/i,
  dietary: /diet|allerg/i,
  meal: /meal|entr[eé]e|main|menu/i,
  table: /^table|seat/i,
  plus_one: /plus|guest\s*of|\+1/i,
  child: /child|kid|age\s*group/i,
  status: /rsvp|status|attend|coming|response/i,
};

const truthy = (v) => /^(y|yes|true|1|x|plus one|child|kid)$/i.test(String(v || '').trim());
export function normalizeStatus(v) {
  const s = String(v || '').trim().toLowerCase();
  if (/^(y|yes|attending|accepted|coming|going|confirmed)/.test(s)) return 'coming';
  if (/^(n|no|declined|not|regrets|can't|cannot)/.test(s)) return 'not_coming';
  return 'waiting';
}

/**
 * Parse an import. Returns { guests, dropped, ignored, error }.
 * `dropped` names the contact columns left out, for the line that says so.
 */
export function importGuests(text) {
  const table = parseCsv(text);
  if (table.length < 2) return { guests: [], dropped: [], ignored: [], error: 'That file has no guests in it. Use a CSV with a header row and one guest per row.' };
  const headers = table[0].map((h) => String(h).trim());
  const dropped = [];
  const ignored = [];
  const map = {};
  headers.forEach((h, i) => {
    if (!h) return;
    if (CONTACT_HEADER.test(h)) { dropped.push(h); return; }
    const key = Object.keys(FIELD_HEADERS).find((k) => FIELD_HEADERS[k].test(h) && map[k] === undefined);
    if (key) map[key] = i; else ignored.push(h);
  });
  if (map.name === undefined && map.first === undefined) return { guests: [], dropped, ignored, error: 'We couldn’t find a name column. Name one column Name, or First name and Last name.' };
  const get = (r, k) => (map[k] === undefined ? '' : String(r[map[k]] ?? '').trim());
  const guests = table.slice(1).map((r) => ({
    name: get(r, 'name') || [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' '),
    dietary: get(r, 'dietary'),
    meal: get(r, 'meal'),
    table: get(r, 'table'),
    plus_one: truthy(get(r, 'plus_one')),
    child: truthy(get(r, 'child')),
    status: map.status === undefined ? 'waiting' : normalizeStatus(get(r, 'status')),
  })).filter((g) => g.name);
  return { guests, dropped, ignored, error: null };
}

export function droppedLine(dropped) {
  if (!dropped.length) return '';
  return `We left out ${dropped.length} column${dropped.length === 1 ? '' : 's'}: ${dropped.join(', ')}. Professional never keeps guests’ contact details.`;
}

/**
 * The panel's figures, from either source: the linked feed's guests, or a
 * standalone list. Rows are { name, status, dietary, meal, table, plus_one, child }.
 */
export function panelFigures(rows) {
  const coming = rows.filter((g) => g.status === 'coming');
  const meals = {};
  coming.forEach((g) => { if (g.meal) meals[g.meal] = (meals[g.meal] || 0) + 1; });
  return {
    invited: rows.length,
    coming: coming.length,
    not_coming: rows.filter((g) => g.status === 'not_coming').length,
    waiting: rows.filter((g) => g.status === 'waiting').length,
    plus_ones: coming.filter((g) => g.plus_one).length,
    children: coming.filter((g) => g.child).length,
    meals,
    dietary: coming.filter((g) => g.dietary).map((g) => ({ name: g.name, need: g.dietary, table: g.table || '' })),
  };
}

/**
 * THE CATERER SHEET: counts by meal, then allergies and dietary needs by
 * table. Returns { meals: [[meal, n]], byTable: [[table, [{name, need}]]] }.
 */
export function catererSheet(rows) {
  const f = panelFigures(rows);
  const byTable = new Map();
  for (const d of f.dietary) {
    const t = d.table || 'No table yet';
    byTable.set(t, [...(byTable.get(t) || []), { name: d.name, need: d.need }]);
  }
  const tableSort = (a, b) => (a === 'No table yet') - (b === 'No table yet') || a.localeCompare(b, 'en', { numeric: true });
  return {
    total: f.coming + f.plus_ones,
    meals: Object.entries(f.meals).sort((a, b) => b[1] - a[1]),
    byTable: [...byTable.entries()].sort((a, b) => tableSort(a[0], b[0])),
  };
}

/** A linked feed's guests into the panel's row shape. */
export function feedRows(feed) {
  return (feed?.guests || []).map((g) => ({ name: g.name || 'Guest', status: g.status, dietary: g.dietary || '', meal: g.meal || '', table: g.table || '', plus_one: !!g.plus_one, child: !!g.child, plus_one_name: g.plus_one_name || '' }));
}

/**
 * THE ONE GUEST COUNT (owner ruling 2026-10-14). Every screen that says how
 * many are coming says it this way: total heads, plus-ones and children
 * included, "8 coming", with "includes 1 plus-one" underneath when there are
 * any. Events home, the Guests panel, day-of mode and the caterer sheet all
 * call this, so they cannot disagree.
 * `totals` is { coming, plus_ones } (guest rows coming, children among them,
 * and the plus-ones coming with them). Missing totals read as not known.
 */
export function guestHeads(totals) {
  if (!totals || totals.coming === null || totals.coming === undefined) return { heads: null, plusOnes: 0, line: 'Not linked yet', sub: '' };
  const plusOnes = Number(totals.plus_ones) || 0;
  const heads = (Number(totals.coming) || 0) + plusOnes;
  return { heads, plusOnes, line: `${heads} coming`, sub: plusOnes ? `includes ${plusOnes} plus-one${plusOnes === 1 ? '' : 's'}` : '' };
}
