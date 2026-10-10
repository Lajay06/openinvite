/**
 * tests/persistence/send-tags-and-bounce-skip.mjs
 *
 * EVERY INVITATION CARRIES THE TAGS A BOUNCE WILL COME BACK ON, AND A BOUNCED
 * ADDRESS IS NOT MAILED AGAIN.
 *
 * Item 2 of goals/2026-10-10-bounces-and-notes.md, the send side of the pair
 * whose other half is api/resend-webhook.js.
 *
 * ── WHY THE TAGS ARE THE WHOLE FEATURE ─────────────────────────────────────
 *
 * api/resend-webhook.js matches a bounce to a guest through guest_id and
 * owner_id and through nothing else: it never searches for an address. So an
 * email sent WITHOUT these tags can never be matched, its bounce is dropped
 * with a log line, and the couple is never told. The webhook shipped first and
 * is live; until these tags go on, it has nothing to act on. That makes "the
 * tags are present" the single assertion the whole goal rests on, which is why
 * it is checked on both send types and on the real handler rather than on a
 * helper.
 *
 * ── AND WHY THE TWO COUNTS ARE MEASURED INDEPENDENTLY ──────────────────────
 *
 * A guest can be opted out AND bounced. Counting one after filtering by the
 * other reports that guest once and silently picks which reason the couple
 * hears. The owner's instruction is that they are counted separately, so the
 * pair may legitimately exceed the number of guests skipped, and the check
 * below asserts exactly that arithmetic rather than a partition.
 *
 * ── WHAT THIS DRIVES ───────────────────────────────────────────────────────
 *
 * The exported handler, through the deps seam the module already offers, with
 * the Resend call stubbed. A guard asserting the SHAPE of the change would
 * pass against a handler rewritten around it; the batch this captures is the
 * actual argument the provider would have received.
 */

import { pass, fail } from './_shared.mjs';

/** The narrowest req/res pair the handler needs. */
function harness(body) {
  const res = {
    statusCode: null, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer not-a-real-token', origin: 'https://openinvite.com.au' },
    // A FRESH IP PER CALL. The endpoint rate limits 20 requests a minute per
    // address, and this file makes more calls than that.
    socket: { remoteAddress: `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` },
    body,
  };
  return { req, res };
}

const OWNER_ID = 'owner_fixture_1';
const WEDDING = {
  coupleNames: 'Ada & Bo',
  coupleName: 'Ada & Bo',
  weddingDate: '2027-05-01',
  venue: 'A hall',
  slug: 'ada-and-bo',
  websiteEnabled: true,
};

/** A guest the endpoint will accept: owned, addressable, with a link. */
const guest = (n, over = {}) => ({
  id: `guest_fixture_${n}`,
  name: `Guest ${n}`,
  email: `guest${n}@example.com`,
  rsvpUrl: `https://openinvite.com.au/r/abc${n}`,
  ...over,
});

export async function runSendTagsAndBounceSkip() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const mod = await import('../../api/send-invites.js');
  const handler = mod.default;

  /**
   * One POST to the endpoint. Returns the status, the body, the batch the
   * provider would have been given, and everything the handler printed.
   */
  const send = async ({ guests, type = 'invite', optedOut = [], bounced = [], callerId = OWNER_ID } = {}) => {
    const { req, res } = harness({ type, guests, wedding: WEDDING, universeId: 'paris' });
    let batch = null;
    const logs = [];
    const realLog = console.log, realErr = console.error;
    console.log = (...a) => logs.push(a.map(String).join(' '));
    console.error = (...a) => logs.push(a.map(String).join(' '));
    try {
      await handler(req, res, {
        sendBatch: async (b) => { batch = b; return { data: { data: b.map((_, i) => ({ id: `e-${i}` })) }, error: null }; },
        verifyUser: async () => ({ id: callerId, email: 'couple@example.com' }),
        fetchOwned: async () => new Set(guests.map((g) => String(g.email || '').toLowerCase())),
        fetchOptedOut: async () => new Set(optedOut.map((e) => e.toLowerCase())),
        fetchBounced: async () => new Set(bounced.map((e) => e.toLowerCase())),
        adminKey: 'not-a-real-admin-key',
      });
    } finally {
      console.log = realLog;
      console.error = realErr;
    }
    return { status: res.statusCode, body: res.payload, batch, logs };
  };

  /** The tags on one message, as a plain object, so a check reads clearly. */
  const tagsOf = (message) => Object.fromEntries((message?.tags || []).map((t) => [t.name, t.value]));

  // ── 1. THE TAGS ARE ON, FOR BOTH THINGS THIS ENDPOINT SENDS ─────────────
  //
  // One endpoint serves invitations and reminders, selected by `type`; there
  // is no api/send-reminders.js. Both are checked because the goal names both
  // and because a tag added to one branch of a template would pass a check
  // written against only the other.

  for (const type of ['invite', 'reminder', 'save_the_date']) {
    const r = await send({ guests: [guest(1)], type });
    const tags = tagsOf(r.batch?.[0]);
    ok(`a ${type} send carries both tags`,
       r.status === 200 && tags.guest_id === 'guest_fixture_1' && tags.owner_id === OWNER_ID,
       `${r.status} / ${JSON.stringify(tags)}`);
  }

  const many = await send({ guests: [guest(1), guest(2), guest(3)] });
  ok('every message in a batch is tagged, not just the first',
     many.batch?.length === 3 && many.batch.every((m) => (m.tags || []).length === 2),
     `${many.batch?.length} message(s), ${many.batch?.filter((m) => (m.tags || []).length === 2).length} tagged`);
  ok('  and each one carries its own guest id',
     new Set(many.batch.map((m) => tagsOf(m).guest_id)).size === 3,
     many.batch.map((m) => tagsOf(m).guest_id).join(', '));
  ok('  while the owner id is the caller, the same on all of them',
     many.batch.every((m) => tagsOf(m).owner_id === OWNER_ID), OWNER_ID);

  // The shape is the send side's, not the webhook's. These are different and
  // getting them the wrong way round sends tags Resend will refuse.
  ok('the tags are an array of name and value pairs, the send API shape',
     Array.isArray(many.batch[0]?.tags)
       && many.batch[0].tags.every((t) => typeof t.name === 'string' && typeof t.value === 'string'
            && Object.keys(t).sort().join(',') === 'name,value'),
     JSON.stringify(many.batch[0]?.tags));
  ok('  and exactly the two the webhook reads, with no third',
     (many.batch[0]?.tags || []).map((t) => t.name).sort().join(',') === 'guest_id,owner_id',
     (many.batch[0]?.tags || []).map((t) => t.name).join(',') || '(no tags)');

  // ── 2. AN ID THAT WOULD NOT PASS RESEND'S RULE DROPS THE TAGS AND SENDS ──
  //
  // A tag helps with a bounce that may never happen; an invitation is the one
  // moment a couple gets with a guest. So the send must survive, and the
  // checks below are as much about `sent` as about the absent tags.

  const badIds = [
    ['a space in the guest id', { id: 'guest one' }],
    ['an at sign in the guest id', { id: 'guest@one' }],
    ['a dot in the guest id', { id: 'guest.one' }],
    ['a guest id over 256 characters', { id: 'g'.repeat(257) }],
    ['no guest id at all', { id: undefined }],
    ['an empty guest id', { id: '' }],
  ];
  for (const [why, over] of badIds) {
    const r = await send({ guests: [guest(1, over)] });
    ok(`${why} drops the tags`,
       r.status === 200 && !('tags' in (r.batch?.[0] || {})),
       `${r.status} / tags ${JSON.stringify(r.batch?.[0]?.tags)}`);
    ok('  and the email still goes out',
       r.status === 200 && r.body?.sent === 1 && r.batch?.[0]?.to === 'guest1@example.com',
       `sent ${r.body?.sent}`);
    ok('  and one log line says so',
       r.logs.filter((l) => /without tags/.test(l)).length === 1,
       r.logs.find((l) => /without tags/.test(l)) || '(no line)');
  }

  // The owner id is the other half, and it comes from the session rather than
  // the request, so a bad one is rarer and no less fatal to matching.
  const badOwner = await send({ guests: [guest(1)], callerId: 'owner one' });
  ok('a caller id that breaks the rule drops the tags too',
     badOwner.status === 200 && !('tags' in (badOwner.batch?.[0] || {})) && badOwner.body?.sent === 1,
     `${badOwner.status} / sent ${badOwner.body?.sent}`);

  // ONE LINE, NOT ONE PER EMAIL. A batch of 200 untagged sends must not put
  // 200 identical lines in the log.
  const manyBad = await send({ guests: [guest(1, { id: 'a b' }), guest(2, { id: 'c d' }), guest(3, { id: 'e f' })] });
  ok('three dropped pairs are reported in one line, with the count',
     manyBad.logs.filter((l) => /without tags/.test(l)).length === 1
       && /3 email\(s\)/.test(manyBad.logs.find((l) => /without tags/.test(l)) || ''),
     manyBad.logs.find((l) => /without tags/.test(l)) || '(no line)');
  ok('  and nothing is logged when every pair is fine',
     many.logs.filter((l) => /without tags/.test(l)).length === 0, 'silent');

  // ── 3. A BOUNCED GUEST IS SKIPPED, LIKE AN OPTED-OUT ONE ────────────────

  const oneBounced = await send({
    guests: [guest(1), guest(2)],
    bounced: ['guest1@example.com'],
  });
  ok('a bounced guest is not sent to',
     oneBounced.status === 200 && oneBounced.batch?.length === 1
       && oneBounced.batch[0].to === 'guest2@example.com',
     `${oneBounced.batch?.length} message(s) to ${oneBounced.batch?.map((m) => m.to).join(', ')}`);
  ok('  and is counted as bounced in the 200',
     oneBounced.body?.skippedBounced === 1, String(oneBounced.body?.skippedBounced));
  ok('  and not counted as opted out',
     oneBounced.body?.skippedOptedOut === 0, String(oneBounced.body?.skippedOptedOut));
  ok('  and the one that went out still carries its tags',
     tagsOf(oneBounced.batch[0]).guest_id === 'guest_fixture_2',
     JSON.stringify(tagsOf(oneBounced.batch[0])));
  ok('  and one log line reports the skip',
     oneBounced.logs.some((l) => /skipped 1 guest\(s\) whose address bounced/.test(l)),
     oneBounced.logs.find((l) => /bounced/.test(l)) || '(no line)');

  // The address is the key, and it is compared case-insensitively, because
  // the stamp is written from whatever Resend reported.
  const mixedCase = await send({
    guests: [guest(1, { email: 'Guest1@Example.com' })],
    bounced: ['guest1@example.com'],
  });
  ok('the match is case insensitive, as the opt-out match already is',
     mixedCase.status === 400 && mixedCase.body?.skippedBounced === 1,
     `${mixedCase.status} / ${mixedCase.body?.skippedBounced}`);

  // ── 4. EVERY GUEST BOUNCED IS SAID PRECISELY ────────────────────────────
  //
  // "No guests with valid email addresses" would be both wrong and useless
  // here: the addresses are perfectly well formed, they just do not work.

  const allBounced = await send({
    guests: [guest(1), guest(2)],
    bounced: ['guest1@example.com', 'guest2@example.com'],
  });
  ok('every guest bounced returns 400',
     allBounced.status === 400, String(allBounced.status));
  ok('  with the sentence the goal specifies, verbatim',
     allBounced.body?.error === 'Every guest you selected has a bounced email address. Fix the addresses and try again.',
     JSON.stringify(allBounced.body?.error));
  ok('  and the count beside it',
     allBounced.body?.skippedBounced === 2, String(allBounced.body?.skippedBounced));
  ok('  and nothing was sent',
     allBounced.batch === null, allBounced.batch === null ? 'no batch built' : 'A BATCH WAS SENT');

  const allOptedOut = await send({
    guests: [guest(1)],
    optedOut: ['guest1@example.com'],
  });
  ok('every guest opted out keeps its own existing sentence',
     allOptedOut.body?.error === 'Every guest you selected has asked not to be emailed.',
     JSON.stringify(allOptedOut.body?.error));

  // ── 5. BOTH AT ONCE, COUNTED SEPARATELY ─────────────────────────────────
  //
  // The arithmetic the owner's instruction asks for. One guest, two
  // conditions, two counts of one: the pair deliberately adds up to more than
  // the number of guests skipped, because these are not two halves of a
  // partition.

  const both = await send({
    guests: [guest(1), guest(2)],
    optedOut: ['guest1@example.com'],
    bounced: ['guest1@example.com'],
  });
  ok('a guest who is both opted out and bounced counts in both',
     both.body?.skippedOptedOut === 1 && both.body?.skippedBounced === 1,
     `optedOut ${both.body?.skippedOptedOut}, bounced ${both.body?.skippedBounced}`);
  ok('  and is skipped exactly once',
     both.batch?.length === 1 && both.batch[0].to === 'guest2@example.com',
     `${both.batch?.length} message(s)`);
  ok('  so the two counts exceed the guests skipped, which is the point',
     both.body.skippedOptedOut + both.body.skippedBounced === 2 && both.batch.length === 1,
     '1 + 1 for one skipped guest');

  const bothOnly = await send({
    guests: [guest(1)],
    optedOut: ['guest1@example.com'],
    bounced: ['guest1@example.com'],
  });
  ok('when the only guest is both, the opt-out sentence wins',
     bothOnly.status === 400
       && bothOnly.body?.error === 'Every guest you selected has asked not to be emailed.'
       && bothOnly.body?.skippedBounced === 1,
     `${JSON.stringify(bothOnly.body?.error)} / bounced ${bothOnly.body?.skippedBounced}`);

  // A mixed batch with nothing left to send: neither precise sentence is true
  // of it, so it falls through rather than claiming one of them.
  const mixed = await send({
    guests: [guest(1), guest(2)],
    optedOut: ['guest1@example.com'],
    bounced: ['guest2@example.com'],
  });
  ok('a mixed all-skipped batch claims neither sentence',
     mixed.status === 400
       && mixed.body?.error === 'No guests with valid email addresses and RSVP links'
       && mixed.body?.skippedOptedOut === 1 && mixed.body?.skippedBounced === 1,
     JSON.stringify(mixed.body?.error));

  // ── 6. THE COUNT IS ALWAYS THERE, SO THE PAGE CAN ALWAYS READ IT ────────

  const clean = await send({ guests: [guest(1)] });
  ok('a send with nothing skipped still reports the count as zero',
     clean.body?.skippedBounced === 0 && 'skippedBounced' in clean.body,
     JSON.stringify(clean.body));
  ok('  and says nothing about bounces in the log',
     clean.logs.filter((l) => /bounced/.test(l)).length === 0, 'silent');

  // ── 7. THE READER THAT FINDS THE BOUNCED ADDRESSES ──────────────────────
  //
  // THE REAL FUNCTION, through the list seam it now takes. The first version
  // of this section re-implemented the filter in the guard and compared the
  // copy with itself, which proves nothing: a plant that widened the
  // production filter to any email_bounce at all left it green. That is the
  // shape this repository has already shipped a hole through, so the seam was
  // added to close it here.
  //
  // email_bounce is an object, so this reader cannot push its filter into the
  // query the way the opt-out reader does. What it must not do is treat a row
  // with no stamp, or a stamp of some other kind, as bounced.

  const ROWS = [
    { email: 'perm@example.com', email_bounce: { kind: 'permanent', at: '2026-10-10T00:00:00.000Z' } },
    { email: 'UPPER@example.com', email_bounce: { kind: 'permanent' } },
    { email: 'padded@example.com  ', email_bounce: { kind: 'permanent' } },
    { email: 'soft@example.com', email_bounce: { kind: 'transient' } },
    { email: 'empty@example.com', email_bounce: {} },
    { email: 'nulled@example.com', email_bounce: null },
    { email: 'clean@example.com' },
    { email: '', email_bounce: { kind: 'permanent' } },
  ];

  let listArgs = null;
  const bouncedSet = await mod.fetchBouncedGuestEmails(OWNER_ID, async (...args) => {
    listArgs = args;
    return ROWS;
  });

  ok('only a permanent stamp counts as bounced',
     bouncedSet.has('perm@example.com') && !bouncedSet.has('soft@example.com')
       && !bouncedSet.has('empty@example.com') && !bouncedSet.has('nulled@example.com')
       && !bouncedSet.has('clean@example.com'),
     [...bouncedSet].join(', '));
  ok('  and the address is normalized, trimmed and lowercased',
     bouncedSet.has('upper@example.com') && bouncedSet.has('padded@example.com'),
     [...bouncedSet].join(', '));
  ok('  and a row with no address adds nothing',
     !bouncedSet.has('') && bouncedSet.size === 3, `${bouncedSet.size} address(es)`);

  // THE OWNER SCOPE IS THE OTHER HALF, and it is the half that matters most:
  // this reads Guest with the admin key, so a query missing created_by_id
  // would pull every account's guests into one couple's skip list.
  ok('the read is scoped to the one account, by created_by_id',
     listArgs?.[0] === 'Guest'
       && listArgs?.[1]?.created_by_id === OWNER_ID
       && Object.keys(listArgs?.[1] || {}).join(',') === 'created_by_id',
     JSON.stringify(listArgs));

  // A FAILED READ SKIPS NOBODY, which is the wrong direction to fail and is
  // chosen deliberately: the alternative refuses every send on one bad query.
  const threwLogs = [];
  const realErr2 = console.error;
  console.error = (...a) => threwLogs.push(a.map(String).join(' '));
  let failedSet;
  try {
    failedSet = await mod.fetchBouncedGuestEmails(OWNER_ID, async () => { throw new Error('network'); });
  } finally { console.error = realErr2; }
  ok('a failed bounce read skips nobody rather than refusing the send',
     failedSet instanceof Set && failedSet.size === 0, `${failedSet?.size} address(es)`);
  ok('  and says so in a log line rather than swallowing it',
     threwLogs.some((l) => /bounce read failed, skipping nobody/.test(l)),
     threwLogs.join(' | ') || '(nothing logged)');

  // The same normalization, through the real handler, so what is asserted
  // above is what actually decides a send.
  const viaHandler = await send({
    guests: [guest(1, { email: 'UPPER@example.com' })],
    bounced: ['upper@example.com'],
  });
  ok('an address normalized that way does skip the send',
     viaHandler.status === 400 && viaHandler.body?.skippedBounced === 1,
     `${viaHandler.status} / ${viaHandler.body?.skippedBounced}`);
  return results;
}
