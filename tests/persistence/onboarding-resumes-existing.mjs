/**
 * tests/persistence/onboarding-resumes-existing.mjs
 *
 * THE WIZARD NEVER MAKES A SECOND WEDDING FOR AN ACCOUNT THAT HAS ONE.
 *
 * Measured on production, 2026-09-14: the smoke account held two
 * WeddingDetails. It entered /onboarding, advanced one screen, and came out
 * holding three. Nothing raced — it is deterministic.
 *
 * ── WHY IT HAPPENED, AND WHY THE FLAG WAS THE WRONG KEY ────────────────────
 *
 * Onboarding adopted the account's record only when it carried
 * `onboardingDraft: true`:
 *
 *     if (draft?.onboardingDraft) { setDraftWeddingId(draft.id); … }
 *
 * A record without that flag left `draftWeddingId` null, and
 * persistDraftStep's `if (id) update else create` then created one.
 *
 * The flag answers "where were they up to", which is a question about the
 * WIZARD. Which record to write to is a question about the ACCOUNT. A
 * find-or-create keyed on a flag finds nothing whenever the flag is absent for
 * any reason — a record made by another surface, a draft already finished, a
 * write that set the fields but not the flag — and read-then-create with
 * nothing to read is the duplicate-record shape.
 *
 * ── AND A DUPLICATE IS A SUBSTITUTION, NOT AN EXTRA ROW ────────────────────
 *
 * Every surface resolves the couple's wedding as the NEWEST owned record —
 * resolveMyWedding's `mostRecent`, and api/my-wedding-details' `getMyWedding`,
 * both `sort((a,b) => b.created_date - a.created_date)[0]`. A new record is
 * always newer, so it becomes the wedding, and the one holding everything the
 * couple had entered stops being resolved anywhere. It is not deleted. It is
 * unreachable, which is worse, because nothing reports it.
 *
 * ── WHY THIS IS A SOURCE GUARD ─────────────────────────────────────────────
 *
 * The defect is one conditional and one create. A browser guard would have to
 * sign up a real account, drive eight screens and count rows in the live
 * database to observe it, and the thing being asserted is that a write does
 * NOT happen. The cheapest honest check is that the adoption is keyed on
 * ownership and the create is reachable only when there is nothing to adopt.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
/** CODE, NOT COMMENTS — this file's own prose names the defect it forbids. */
const code = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

export async function runOnboardingResumesExisting() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const onboarding = read('src/pages/Onboarding.jsx');
  const src = code(onboarding);
  check('the wizard is readable', onboarding.length > 5000, `${onboarding.length} chars`);

  // ── 1. adoption is by ownership ───────────────────────────────────────────
  // `draft` is getMyWeddingDetails() — the same record the dashboard resolves.
  check('  it resolves the account\'s own record', /const draft = await getMyWeddingDetails\(\)/.test(src),
    'getMyWeddingDetails(), the resolver every surface uses');
  const adopts = /if \(draft\) \{[^}]*draftWeddingIdRef\.current = draft\.id;[^}]*setDraftWeddingId\(draft\.id\);[^}]*\}/s.test(src);
  check('  and adopts its id whenever one exists', adopts, adopts ? 'if (draft) — no flag in the condition' : 'the id is not adopted unconditionally');
  // THE DEFECT ITSELF, named so it cannot come back wearing the same shape.
  const flagGated = /if \(draft\?\.onboardingDraft\) \{\s*setDraftWeddingId/.test(src);
  check('  the id is NOT taken only when the draft flag is set', !flagGated,
    flagGated ? 'setDraftWeddingId is inside the onboardingDraft branch again' : 'the flag gates rehydration, not adoption');
  // The ref matters as much as the state: they are synced by an effect, and a
  // create firing before that effect commits is the duplicate this prevents.
  check('    and the ref is set with it, not only the state',
    /draftWeddingIdRef\.current = draft\.id;/.test(src), 'no window between the read and the first write');

  // ── 2. create is reachable only with nothing to adopt ─────────────────────
  const creates = [...src.matchAll(/WeddingDetails\.create\(/g)].length;
  check('  the wizard has exactly the two creates it is allowed', creates === 2,
    `${creates} WeddingDetails.create call(s) — the draft create and the final save`);
  // Each sits in the else of an `if (<an id>)`.
  const guardedDraft = /if \(draftWeddingIdRef\.current\) \{\s*await WeddingDetails\.update\([\s\S]{0,200}?\} else \{\s*const created = await WeddingDetails\.create\(/.test(src);
  check('    the draft create runs only with no record adopted', guardedDraft, 'if (draftWeddingIdRef.current) update else create');
  const guardedFinal = /if \(weddingId\) \{\s*await WeddingDetails\.update\([\s\S]{0,200}?\} else \{\s*const created = await WeddingDetails\.create\(/.test(src);
  check('    and the final save the same way', guardedFinal, 'if (weddingId) update else create');

  // ── 3. the re-entry path ends on the same record (#745) ───────────────────
  //
  // needsOnboarding decides whether a returning couple is sent back here at
  // all. It is a pure read — if it ever wrote, re-entry would itself be a
  // create — and a record with a slug is never routed to the wizard, so the
  // one account that certainly has work to lose is never offered the path
  // that could substitute it.
  const gate = read('src/lib/needsOnboarding.js');
  check('  the re-entry gate writes nothing', !/(update|create|save)\(/.test(code(gate)),
    'needsOnboarding reads a record and returns a route');
  check('    and a record with an address is never sent to the wizard', /if \(wedding\.slug\) return false;/.test(gate),
    'slug is the first term');
  // And when it IS sent, checkAuth adopts before any step can persist: the
  // adoption block runs inside checkAuth, ahead of persistDraftStep's first
  // possible call, which is a user clicking through a screen.
  const adoptAt = src.indexOf('draftWeddingIdRef.current = draft.id');
  const persistAt = src.indexOf('const persistDraftStep');
  check('    and adoption happens before any step can persist', adoptAt > 0 && adoptAt < persistAt,
    `adopted at ${adoptAt}, persistDraftStep defined at ${persistAt}`);

  // ── 4. the resolution rule the substitution argument rests on ─────────────
  //
  // If "newest wins" ever became "first wins", a duplicate would stop
  // substituting and this guard's reasoning would be stale — so the rule is
  // pinned in both places that implement it, and they have to agree.
  const client = code(read('src/lib/resolveMyWedding.js'));
  const server = code(read('api/my-wedding-details.js'));
  const NEWEST = /sort\(\(a, b\) => new Date\(b\.created_date\) - new Date\(a\.created_date\)\)\[0\]/;
  check('the couple\'s wedding is the newest owned record, client and server',
    NEWEST.test(client) && NEWEST.test(server), 'resolveMyWedding.mostRecent and my-wedding-details.getMyWedding agree');
  check('  and both resolve by ownership', /created_by_id/.test(client) && /created_by_id/.test(server),
    'created_by_id === the caller');

  return results;
}
