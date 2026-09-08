/**
 * A FROZEN RECORD HEALS ITSELF ON READ.
 *
 * PR #446 redeclared `dayVendorContacts` from `array` to `string` (AES-256-GCM
 * ciphertext) and rewrote no existing row. Base44 validates the MERGED record
 * rather than the patch, so every row still holding `[]` became permanently
 * unwritable: every save failed citing a field the writer never touched
 * (BASE44_PLATFORM_NOTES.md:197). Measured 2026-09-08 — 15 of 21
 * WeddingDetails rows, one of them a real person's.
 *
 * THE REPAIR HAD TO GO ON THE READ, and that is the part worth understanding.
 * A frozen row cannot be fixed by the couple doing anything, because
 * everything they might do is a write and every write fails. And it cannot be
 * fixed by a script: WeddingDetails RLS scopes `update` to
 * `created_by_id == {{user.id}}`, an admin key is not a user, and an
 * admin-key PUT was tried under authorization on 2026-09-08 and refused 403
 * on the first row. The couple's own token is the only credential that can
 * rewrite their record, and the GET is the only interaction that still works.
 *
 * These call the REAL handler with a stubbed backend, so they prove the heal
 * is wired into the request path rather than that a function works alone.
 * Every Base44 call is counted, because the property under test is partly
 * about a write NOT happening.
 */
import { pass, fail } from './_shared.mjs';

// The handler refuses with 500 "Server not configured" before doing anything
// if this is unset, which would make every check below pass by not running.
process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-placeholder-not-a-real-key';

const { encryptPayload, decryptPayload } = await import('../../api/_lib/questionnaireCrypto.js');

const USER = { id: 'u-heal', email: 'couple@example.com', plan: 'pro', created_date: '2025-01-01T00:00:00Z' };

function mockRes() {
  const r = { statusCode: null, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; r.ended = true; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

/**
 * Runs a real GET against a one-row fake backend.
 * Returns the response, every PUT body seen, and the row's final state.
 */
async function getWithRow(row, { putFails = false } = {}) {
  const puts = [];
  let stored = { ...row };
  const realFetch = globalThis.fetch;
  const logged = [];
  const realError = console.error;
  const realWarn = console.warn;
  console.error = (...a) => logged.push(a.join(' '));
  console.warn = (...a) => logged.push(a.join(' '));

  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.includes('/entities/User/me')) return ok(USER);
    if ((opts.method || 'GET') === 'PUT' && u.includes('/entities/WeddingDetails/')) {
      const body = JSON.parse(opts.body);
      puts.push(body);
      if (putFails) {
        return { ok: false, status: 422, json: async () => ({}), text: async () => '{"message":"Permission denied"}' };
      }
      stored = { ...stored, ...body };
      return ok(stored);
    }
    // Single-record GET (the post-heal re-read).
    if (u.includes('/entities/WeddingDetails/')) return ok(stored);
    // List query.
    if (u.includes('/entities/WeddingDetails')) return ok([stored]);
    return ok({ data: [] });
  };

  try {
    const mod = await import('../../api/my-wedding-details.js');
    const req = { method: 'GET', headers: { authorization: 'Bearer caller-token' }, query: {}, body: {} };
    const res = mockRes();
    await mod.default(req, res);
    return { res, puts, stored, logged };
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    console.warn = realWarn;
  }
}

const FROZEN = {
  id: 'w-frozen', created_by_id: USER.id, created_by: USER.email, slug: 'nadia-theo',
  couple1Name: 'Nadia', is_test: false, created_date: '2026-01-01T00:00:00Z',
  dayVendorContacts: [],                        // the legacy shape that freezes the row
};

export async function runHealLegacyEncryptedFields() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  A frozen record heals itself on read:\n');

  // ── 1. A LEGACY ROW IS HEALED, EXACTLY ONCE ──────────────────────────────
  {
    const { res, puts, stored } = await getWithRow(FROZEN);
    check('the GET still succeeds', res.statusCode === 200, `HTTP ${res.statusCode}`);
    check('exactly one PUT is made', puts.length === 1, `${puts.length} PUT(s)`);
    check('  and it writes only dayVendorContacts',
      puts.length === 1 && Object.keys(puts[0]).length === 1 && 'dayVendorContacts' in puts[0],
      puts.length ? Object.keys(puts[0]).join(', ') : '(none)');
    const written = puts[0]?.dayVendorContacts;
    check('  as a string', typeof written === 'string', typeof written);
    let decrypted = null;
    try { decrypted = JSON.stringify(decryptPayload(written)); } catch { decrypted = 'DECRYPT FAILED'; }
    check('  that decrypts back to []', decrypted === '[]', String(decrypted));
    check('the stored row is now ciphertext', typeof stored.dayVendorContacts === 'string');

    // THE COUPLE MUST STILL SEE THEIR OWN VALUE. A heal that changed what the
    // page reads would be a data change wearing a repair's clothes.
    check('and the response still reads as the empty list it always was',
      JSON.stringify(res.body?.dayVendorContacts) === '[]', JSON.stringify(res.body?.dayVendorContacts));
    check('  with the rest of the record untouched',
      res.body?.couple1Name === 'Nadia' && res.body?.slug === 'nadia-theo' && res.body?.id === 'w-frozen');
  }

  // ── 2. A HEALTHY ROW MAKES ZERO WRITES ───────────────────────────────────
  //
  // The whole safety argument. If a healed row healed again, every dashboard
  // load would write to the database forever.
  {
    const healthy = { ...FROZEN, dayVendorContacts: encryptPayload([]) };
    const { res, puts } = await getWithRow(healthy);
    check('a healthy row makes ZERO writes', puts.length === 0, `${puts.length} PUT(s)`);
    check('  and still returns the decrypted value',
      res.statusCode === 200 && JSON.stringify(res.body?.dayVendorContacts) === '[]',
      JSON.stringify(res.body?.dayVendorContacts));
  }

  // ── 3. IDEMPOTENT: heal, then read again ─────────────────────────────────
  {
    const { stored } = await getWithRow(FROZEN);
    const { puts: second } = await getWithRow(stored);
    check('reading the healed row again makes ZERO further writes', second.length === 0, `${second.length} PUT(s)`);
  }

  // ── 4. A ROW WITH NOTHING LEGACY IS NEVER TOUCHED ────────────────────────
  {
    const absent = { ...FROZEN };
    delete absent.dayVendorContacts;
    const { puts } = await getWithRow(absent);
    check('an absent field is not "legacy" and is not written', puts.length === 0, `${puts.length} PUT(s)`);

    const nulled = { ...FROZEN, dayVendorContacts: null };
    const { puts: p2 } = await getWithRow(nulled);
    check('a null field is not "legacy" either', p2.length === 0, `${p2.length} PUT(s)`);
  }

  // ── 5. EVERY ENCRYPTED FIELD, NOT JUST THE ONE THAT BROKE ────────────────
  {
    const multi = { ...FROZEN, budget: { total: 1 }, emergencyContacts: [{ name: 'A' }] };
    const { puts } = await getWithRow(multi);
    check('all legacy encrypted fields heal in ONE PUT', puts.length === 1, `${puts.length} PUT(s)`);
    check('  naming exactly the legacy ones',
      puts.length === 1 && ['budget', 'dayVendorContacts', 'emergencyContacts'].every((f) => f in puts[0])
        && Object.keys(puts[0]).length === 3,
      puts.length ? Object.keys(puts[0]).sort().join(', ') : '(none)');
  }

  // ── 6. A FAILED HEAL RETURNS THE ROW, NOT AN ERROR ───────────────────────
  //
  // A read must not start failing because a repair could not be attempted.
  {
    const { res, logged } = await getWithRow(FROZEN, { putFails: true });
    check('a failed heal still returns 200 with the unhealed row',
      res.statusCode === 200 && JSON.stringify(res.body?.dayVendorContacts) === '[]',
      `HTTP ${res.statusCode} ${JSON.stringify(res.body?.dayVendorContacts)}`);
    const line = logged.find((l) => l.startsWith('[heal-legacy] dayVendorContacts'));
    check('  and logs [heal-legacy] <field> <status>', !!line && /\b422\b/.test(line), line || '(no log line)');
  }

  // ── 7. SOMEBODY ELSE'S ROW IS NEVER WRITTEN ──────────────────────────────
  //
  // RLS already guarantees this. The assert exists so a refactor that loses
  // the ownership filter fails here rather than in production.
  {
    const foreign = { ...FROZEN, created_by_id: 'someone-else' };
    const { puts, logged } = await getWithRow(foreign);
    check('a row owned by another user is NOT healed', puts.length === 0, `${puts.length} PUT(s)`);
    check('  and the refusal is logged',
      logged.some((l) => l.includes('[heal-legacy] refusing')), 'refusal logged');
  }

  return results;
}
