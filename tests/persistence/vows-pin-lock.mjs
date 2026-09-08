/**
 * A PIN LOCKS ONE VOW, AND THE PIN ITSELF IS NEVER STORED.
 *
 * The package that specified this stopped rather than build it: VowSpeech had
 * five fields and no unused text field, and the instruction said never to
 * store a PIN in clear. `pin_hash` was declared 2026-09-08 (c832e9e), so this
 * is the first thing that has ever exercised it.
 *
 * WHAT IS ACTUALLY BEING CHECKED, in order of how badly it would matter:
 *
 *   1. THE STORED VALUE IS NEVER THE PIN. Every write is inspected: the value
 *      must be `scrypt$<salt>$<digest>` and must not contain the digits the
 *      couple typed. This is the whole reason the package stopped.
 *   2. TWO ITEMS WITH THE SAME PIN DO NOT SHARE A DIGEST. Per-value salt, so
 *      the store never reveals which items share a PIN.
 *   3. A WRONG PIN OPENS NOTHING, and a right one does.
 *   4. SOMEBODY ELSE'S ITEM IS UNREACHABLE — 404, not 403, so a caller cannot
 *      even learn the row exists.
 *   5. CLEARING NEEDS NO PIN, which is the ruling rather than an oversight:
 *      there is no recovery flow, so removing the lock IS the recovery.
 *
 * These call the REAL handler with a stubbed Base44, so they prove the rules
 * are wired into the request path rather than that a helper works alone.
 */
import { pass, fail } from './_shared.mjs';

process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-placeholder-not-a-real-key';

const { isValidPin, hashPin, verifyPin, isLocked } = await import('../../api/_lib/vowPinHash.js');

const OWNER = { id: 'u-owner', email: 'couple@example.com', plan: 'pro', created_date: '2025-01-01T00:00:00Z' };

function mockRes() {
  const r = { statusCode: null, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; r.ended = true; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

/** One POST against a one-row fake backend. Returns the response and every write. */
async function call(body, { row, user = OWNER } = {}) {
  const writes = [];
  let stored = { ...row };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const ok = (b) => ({ ok: true, status: 200, json: async () => b, text: async () => JSON.stringify(b) });
    if (u.includes('/entities/User/me')) return ok(user);
    if ((opts.method || 'GET') === 'PUT' && u.includes('/entities/VowSpeech/')) {
      const patch = JSON.parse(opts.body);
      writes.push(patch);
      stored = { ...stored, ...patch };
      return ok(stored);
    }
    if (u.includes('/entities/VowSpeech/')) return ok(stored);
    return ok({ data: [] });
  };
  try {
    const mod = await import('../../api/vow-pin.js');
    const req = { method: 'POST', headers: { authorization: 'Bearer caller-token' }, query: {}, body };
    const res = mockRes();
    await mod.default(req, res);
    return { res, writes, stored };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const ROW = { id: 'v1', created_by_id: OWNER.id, title: 'My vows', content: 'Secret words', pin_hash: null };

export async function runVowsPinLock() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  The vows PIN lock — and the PIN that is never stored:\n');

  // ── 1. THE STORED VALUE IS NEVER THE PIN ────────────────────────────────
  {
    const PIN = '4821';
    const { res, writes } = await call({ id: 'v1', action: 'set', pin: PIN }, { row: ROW });
    check('setting a PIN succeeds', res.statusCode === 200 && res.body?.locked === true, `HTTP ${res.statusCode}`);
    check('  it writes exactly one field, pin_hash',
      writes.length === 1 && Object.keys(writes[0]).length === 1 && 'pin_hash' in writes[0],
      writes.length ? Object.keys(writes[0]).join(', ') : '(none)');
    const v = writes[0]?.pin_hash || '';
    check('  the stored value is a scrypt hash', /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(v), v.slice(0, 24) + '…');
    // THE CHECK THE WHOLE PACKAGE STOPPED FOR.
    check('  and the PIN itself appears nowhere in it', !v.includes(PIN), 'no plaintext PIN in the stored value');
    check('  nor anywhere else in the write', !JSON.stringify(writes).includes(PIN));
  }

  // ── 2. SAME PIN, DIFFERENT DIGEST ───────────────────────────────────────
  {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    check('two items with the same PIN store different values', a !== b, 'per-value salt');
    check('  and both still verify', (await verifyPin(a, '1234')) && (await verifyPin(b, '1234')));
  }

  // ── 3. A WRONG PIN OPENS NOTHING ────────────────────────────────────────
  {
    const locked = { ...ROW, pin_hash: await hashPin('4821') };
    const right = await call({ id: 'v1', action: 'unlock', pin: '4821' }, { row: locked });
    check('the right PIN unlocks', right.res.statusCode === 200 && right.res.body?.ok === true,
      `HTTP ${right.res.statusCode}`);
    const wrong = await call({ id: 'v1', action: 'unlock', pin: '4822' }, { row: locked });
    check('a wrong PIN is refused with 401', wrong.res.statusCode === 401 && wrong.res.body?.ok === false,
      `HTTP ${wrong.res.statusCode}`);
    check('  and a refused unlock writes nothing', wrong.writes.length === 0, `${wrong.writes.length} write(s)`);
    // The response must not carry the text — the reveal is the client's to do
    // from a record it already reads, and an endpoint that returned content
    // would become a way to fetch it.
    check('  no unlock response ever carries the content',
      !JSON.stringify(right.res.body).includes('Secret words')
      && !JSON.stringify(wrong.res.body).includes('Secret words'));
  }

  // ── 4. THE SHAPE IS ENFORCED SERVER-SIDE ────────────────────────────────
  {
    for (const bad of ['', '123', '1234567', 'abcd', '12a4', null]) {
      const r = await call({ id: 'v1', action: 'set', pin: bad }, { row: ROW });
      check(`  a PIN of ${JSON.stringify(bad)} is refused`, r.res.statusCode === 400 && r.writes.length === 0,
        `HTTP ${r.res.statusCode}, ${r.writes.length} write(s)`);
    }
    check('  and the validator agrees', isValidPin('1234') && isValidPin('123456') && !isValidPin('12345678'));
  }

  // ── 5. SOMEBODY ELSE'S ITEM IS UNREACHABLE ──────────────────────────────
  {
    const foreign = { ...ROW, created_by_id: 'someone-else' };
    for (const action of ['set', 'unlock', 'clear']) {
      const r = await call({ id: 'v1', action, pin: '4821' }, { row: foreign });
      check(`  ${action} on another owner's item is 404`, r.res.statusCode === 404 && r.writes.length === 0,
        `HTTP ${r.res.statusCode}, ${r.writes.length} write(s)`);
    }
  }

  // ── 6. CLEARING NEEDS NO PIN — THE RULING'S RECOVERY PATH ───────────────
  {
    const locked = { ...ROW, pin_hash: await hashPin('4821') };
    const r = await call({ id: 'v1', action: 'clear' }, { row: locked });
    check('clearing the lock needs no PIN', r.res.statusCode === 200 && r.res.body?.locked === false,
      `HTTP ${r.res.statusCode}`);
    check('  and it nulls pin_hash, nothing else',
      r.writes.length === 1 && Object.keys(r.writes[0]).length === 1 && r.writes[0].pin_hash === null,
      JSON.stringify(r.writes[0] || {}));
    check('  the item then reads as unlocked', !isLocked(r.stored.pin_hash));
  }

  // ── 7. A CORRUPT OR PLAINTEXT HASH STAYS SHUT ───────────────────────────
  //
  // pin_hash has never held plaintext. If it ever did, a plaintext compare
  // would succeed and look exactly like the feature working.
  {
    check('a plaintext pin_hash never verifies', !(await verifyPin('4821', '4821')), 'refused');
    check('a malformed hash never verifies', !(await verifyPin('scrypt$zz$zz', '4821')), 'refused');
    check('an empty hash is not a lock', !isLocked('') && !isLocked(null) && !isLocked(undefined));
  }

  // ── 8. TEN TRIES, THEN THE DOOR STOPS ANSWERING ─────────────────────────
  //
  // scrypt makes each guess expensive, which raises the PRICE of a brute
  // force without capping it. A million candidates at a few hundred
  // milliseconds is still a weekend. The limit is what turns that into
  // decades, and it costs an honest couple nothing — nobody mistypes their
  // own four digits ten times in a quarter of an hour.
  {
    const locked = { ...ROW, id: 'v-rate', pin_hash: await hashPin('4821') };
    const codes = [];
    for (let i = 0; i < 11; i++) {
      const r = await call({ id: 'v-rate', action: 'unlock', pin: '0000' }, { row: locked });
      codes.push(r.res.statusCode);
    }
    check('the first ten wrong tries are refused normally',
      codes.slice(0, 10).every((c) => c === 401), codes.slice(0, 10).join(','));
    check('  and the eleventh is refused with 429', codes[10] === 429, `#11 -> ${codes[10]}`);

    // AND THE LIMIT MUST NOT LOCK OUT THE RIGHT PIN ON A DIFFERENT VOW.
    // The bucket is per vow, so one item's exhausted allowance cannot shut
    // the couple out of another.
    const other = { ...ROW, id: 'v-other', pin_hash: await hashPin('4821') };
    const fresh = await call({ id: 'v-other', action: 'unlock', pin: '4821' }, { row: other });
    check('  a different vow is unaffected by another’s limit',
      fresh.res.statusCode === 200 && fresh.res.body?.ok === true, `HTTP ${fresh.res.statusCode}`);

    // Clearing is the only way back in, so it must never be rate-limited.
    const rescue = await call({ id: 'v-rate', action: 'clear' }, { row: locked });
    check('  and the recovery path still works while limited',
      rescue.res.statusCode === 200 && rescue.res.body?.locked === false, `HTTP ${rescue.res.statusCode}`);
  }

  // ── 9. AN UNAUTHENTICATED CALLER GETS NOWHERE ───────────────────────────
  {
    const r = await call({ id: 'v1', action: 'unlock', pin: '4821' }, { row: ROW, user: null });
    check('an unauthenticated caller is refused', r.res.statusCode === 401 && r.writes.length === 0,
      `HTTP ${r.res.statusCode}`);
  }

  return results;
}
