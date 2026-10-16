/**
 * tests/persistence/mobile-preview-equals-email.mjs
 *
 * THE APP'S PREVIEW OF AN INVITATION WRITES THE DATE EXACTLY AS THE EMAIL
 * DOES. Owner ruling 2026-10-16(b), for the app: "Monday, June 14, 2027" for
 * a month-first couple, "Monday 14 June 2027" for a day-first one, weekday
 * included, and the same string in the preview the couple approves and in
 * what the guest receives.
 *
 * Before this, src/mobile/lib/dates.js wrote its own written date with no
 * weekday ("June 14, 2027"), and SendInvitesScreen sent no order with the
 * send, so after #1100 the server would have written every app-sent email
 * day-first whatever the preview said.
 *
 * Five halves, all run, none read off a comment.
 *
 *   1. THE SHAPE. formatAppDateWritten gives the two ruled strings, on a phone
 *      west of Greenwich, so a UTC reading of a date-only string would show
 *      the day before.
 *   2. ONE FORMATTER. For both orders and several inputs it equals
 *      formatWeddingDateText, the email's own function.
 *   3. THE EMAIL. renderInvitationEmail, given the same order, carries the
 *      app's string in both its HTML and its text part.
 *   4. THE SEND. SendInvitesScreen's own lines (the resolved order, the
 *      preview string, the send payload) are lifted from the source and run
 *      for a "dmy" couple and an "mdy" couple: the payload carries
 *      dateFormat, and api/send-invites.js's own expression, run on that
 *      payload, writes the same string the preview showed. A probe drops
 *      dateFormat from the payload and proves the check then fails.
 *   5. THE STARTER. PlanContainer's starter invitation design is the one
 *      written date with NO weekday, "June 14, 2027" or "14 June 2027", as
 *      the web's starter (lane A's ruling, accepted). Its own line is run.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SCREEN = 'src/mobile/screens/guests/SendInvitesScreen.jsx';
const SERVER = 'api/send-invites.js';
const STARTER = 'src/mobile/screens/plan/PlanContainer.jsx';
const WEEKDAY = /\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b/;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** One `const NAME = EXPR;` line from a source, or null. */
function lift(src, name) {
  const m = src.match(new RegExp(`^\\s*const ${name} = (.+);\\s*$`, 'm'));
  return m ? m[1] : null;
}

/** Runs a lifted expression with only the names given in scope; any other name reads as undefined. */
function run(expr, scope) {
  const env = new Proxy(scope, {
    has: () => true,
    get: (t, k) => (k === Symbol.unscopables ? undefined : t[k]),
  });
  return new Function('__env', `with (__env) { return (${expr}); }`)(env);
}

export async function runMobilePreviewEqualsEmail() {
  const results = [];
  const ok = (name, cond, note) => results.push(cond ? pass(name, note) : fail(name, 'true', note));

  // The CI runner imports every guard into one process, so the zone and the
  // storage stub are put back afterwards (a leaked TZ once moved
  // wedding-season.mjs's December dates into November).
  const hadTZ = 'TZ' in process.env;
  const prevTZ = process.env.TZ;
  const prevStorage = globalThis.localStorage;
  process.env.TZ = 'America/Los_Angeles';
  let stored = null;
  globalThis.localStorage = { getItem: (k) => (k === 'oi_user' ? stored : null) };
  try {
    const app = await import(path.join(ROOT, 'src/mobile/lib/dates.js'));
    const { formatWeddingDateText, DEFAULT_WRITTEN_FORMAT } = await import(path.join(ROOT, 'src/lib/weddingDateText.js'));
    const { renderInvitationEmail } = await import(path.join(ROOT, 'src/lib/emailTemplate.js'));
    const { sanitizeString } = await import(path.join(ROOT, 'api/_lib/security.js'));

    // 1. The shape.
    const shape = ['mdy', 'dmy'].map((format) => app.formatAppDateWritten('2027-06-14', { format }));
    ok('the app writes "Monday, June 14, 2027" and "Monday 14 June 2027"',
       shape.join(' | ') === 'Monday, June 14, 2027 | Monday 14 June 2027', shape.join(' | '));

    // 2. One formatter.
    const inputs = ['2027-06-14', '2026-10-16', '2026-12-31T23:30:00', new Date(2027, 0, 1, 9, 0)];
    const drift = [];
    for (const format of ['mdy', 'dmy']) {
      for (const v of inputs) {
        const a = app.formatAppDateWritten(v, { format });
        const e = formatWeddingDateText(v, format);
        if (a !== e) drift.push(`${format} ${String(v)}: app "${a}" vs email "${e}"`);
      }
    }
    ok('  and equals the email\'s formatter for both orders and every input', drift.length === 0, drift.join('; ') || `${inputs.length * 2} cases`);
    ok('  and no date is the empty string, as the email\'s', app.formatAppDateWritten('') === '' && app.formatAppDateWritten(null) === '');

    // 3. The email.
    for (const format of ['mdy', 'dmy']) {
      const shown = app.formatAppDateWritten('2027-06-14', { format });
      const { html, text } = renderInvitationEmail({
        universeId: 'paris', type: 'save-the-date', coupleNames: 'Priya & Sam', siteUrl: 'https://example.com/w/x',
        weddingDate: '2027-06-14', dateFormat: format, events: [], personalMessage: 'See you there.',
      });
      ok(`the rendered email carries the app's "${shown}" (${format})`, html.includes(shown) && text.includes(shown), `html ${html.includes(shown)}, text ${text.includes(shown)}`);
    }

    // 4. The send.
    const screen = stripComments(read(SCREEN), { line: true });
    const server = stripComments(read(SERVER), { line: true });
    const orderExpr = lift(screen, 'dateFormat');
    const previewExpr = lift(screen, 'dateStr');
    const payloadExpr = lift(screen, 'weddingPayload');
    ok(`${SCREEN} resolves the order once, from appDateFormat`, orderExpr === 'appDateFormat()', orderExpr || 'no `const dateFormat =` line');
    ok('  and its preview and email preview both read that order',
       /formatAppDateWritten\(weddingDate, \{ format: dateFormat \}\)/.test(previewExpr || '') && /renderInvitationEmail\(\{[^}]*\bdateFormat\b/.test(screen),
       previewExpr || 'no `const dateStr =` line');
    const sends = screen.match(/api\.json\('\/api\/send-invites'[^\n]*/g) || [];
    ok('  and every /api/send-invites call sends that payload',
       sends.length >= 2 && sends.every((l) => /\bwedding: weddingPayload\b/.test(l)), `${sends.length} calls`);

    const serverOrder = lift(server, 'dateFormat');
    const serverDate = lift(server, 'dateStr');
    ok(`${SERVER} writes the date in the order the client sends`,
       serverOrder === 'sanitizeString(wedding.dateFormat) || DEFAULT_WRITTEN_FORMAT' && serverDate === 'formatWeddingDateText(weddingDate, dateFormat)',
       `${serverOrder} / ${serverDate}`);

    const sendFor = (couple, payloadSrc) => {
      stored = JSON.stringify({ dateFormat: couple });
      const scope = { appDateFormat: app.appDateFormat, formatAppDateWritten: app.formatAppDateWritten, weddingDate: '2027-06-14' };
      scope.dateFormat = run(orderExpr, scope);
      const preview = run(previewExpr, scope);
      const payload = run(payloadSrc, scope);
      const sScope = { sanitizeString, DEFAULT_WRITTEN_FORMAT, formatWeddingDateText, wedding: payload, weddingDate: sanitizeString(payload.weddingDate) || '' };
      sScope.dateFormat = run(serverOrder, sScope);
      return { preview, payload, email: run(serverDate, sScope) };
    };
    for (const couple of ['dmy', 'mdy']) {
      const r = sendFor(couple, payloadExpr);
      ok(`a "${couple}" couple's send payload carries dateFormat "${couple}"`, r.payload?.dateFormat === couple, String(r.payload?.dateFormat));
      ok(`  and the email it produces writes the preview's "${r.preview}"`, r.email === r.preview && r.preview !== '', `email "${r.email}"`);
    }

    // The probe: without dateFormat in the payload the server falls back to
    // day-first, and a month-first couple's email disagrees with its preview.
    const bare = sendFor('mdy', payloadExpr.replace(/\bdateFormat,\s*/, ''));
    ok('  and the check fails when the payload drops dateFormat', bare.email !== bare.preview, `"${bare.preview}" vs "${bare.email}"`);

    // 5. The starter. PlanContainer's starter invitation design is printed on
    // the invitation, not sent, and carries no weekday (lane A's ruling,
    // accepted): its own line, lifted and run, for both orders.
    const plan = stripComments(read(STARTER), { line: true });
    const starterExpr = lift(plan, 'shown');
    const starter = (couple) => {
      stored = JSON.stringify({ dateFormat: couple });
      return run(starterExpr, { formatAppDateWritten: app.formatAppDateWritten, weddingDate: '2027-06-14' });
    };
    const starters = ['mdy', 'dmy'].map(starter);
    ok(`${STARTER}'s starter design has no weekday: "June 14, 2027" and "14 June 2027"`,
       starters.join(' | ') === 'June 14, 2027 | 14 June 2027', starters.join(' | ') || 'no `const shown =` line');
    ok('  while the send preview keeps it', !WEEKDAY.test(starters.join(' ')) && WEEKDAY.test(app.formatAppDateWritten('2027-06-14', { format: 'mdy' })));
  } finally {
    if (hadTZ) process.env.TZ = prevTZ; else delete process.env.TZ;
    globalThis.localStorage = prevStorage;
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobilePreviewEqualsEmail();
  process.exit(r.every(Boolean) ? 0 : 1);
}
