/**
 * tests/persistence/guest-site-currency.mjs
 *
 * THE GUEST SEES THE COUPLE'S CURRENCY, AND NOTHING ELSE FROM THEIR ACCOUNT.
 *
 * Item 5 of goals/2026-10-09-budget-units.md, under the same owner decision as
 * the dashboard: "They select the currency and everything on their dash is in
 * that currency." The registry page is the one guest surface that prints money,
 * so it falls under the same rule.
 *
 * ── THE BUG THIS EXISTS TO KEEP OUT ────────────────────────────────────────
 *
 * WeddingRegistryPage printed `${fund.requested_amount.toLocaleString()}` and
 * `${product.price.toLocaleString()}`: a hardcoded dollar sign on a number the
 * couple typed in their own currency. A couple planning in euros told their
 * guests a cash-fund goal in dollars. Nobody converted anything, so the figure
 * was right and the symbol was a lie, which is the worse of the two failures:
 * a guest contributing 500 "dollars" to a 2,000 euro goal has no way to know.
 *
 * ── AND THE BUG THE FIX COULD HAVE INTRODUCED ──────────────────────────────
 *
 * The currency lives on User, not on WeddingDetails, and the guest site has no
 * session. Fixing the symbol therefore meant widening the guest payload with a
 * field from the OWNER'S ACCOUNT RECORD, past an allowlist that exists because
 * this endpoint is reachable by anyone with a slug. The owner ruled: that one
 * field, the ISO code, and nothing else.
 *
 * So this guard has two halves, and the second matters more than the first.
 * The first says the symbol is right. The second says the widening stayed one
 * three-letter string wide: resolveOwnerCurrency returns a CODE, never the user
 * object it read, so there is no shape from which a later edit could spread the
 * email address or the plan into a public response by spreading one more key.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { formatMoney } from '../../src/lib/money.js';
import {
  pickGuestSafeFields,
  resolveOwnerCurrency,
} from '../../api/_lib/guestSafeWedding.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

const REGISTRY_PAGE = 'src/components/guest-website/pages/WeddingRegistryPage.jsx';

/** A fixture wedding, enough of one to build a payload from. */
const WEDDING = {
  id: 'wed-fixture',
  slug: 'alex-and-sam',
  created_by_id: 'user-fixture',
  coupleNames: 'Alex & Sam',
  weddingDate: '2027-05-01',
};

/**
 * A User record with everything a real one carries. Every field here except
 * `currency` is something a guest must never see, and each is a distinctive
 * string so a deep scan of the payload can look for the VALUE, not the key.
 */
const OWNER = {
  id: 'user-fixture',
  currency: 'AUD',
  email: 'owner-fixture-email@example.test',
  full_name: 'Owner Fixture Name',
  plan: 'pro-fixture-plan',
  planActivatedAt: '2026-01-01T00:00:00.000Z',
  role: 'admin-fixture-role',
  lifecycleEmails: true,
  retentionEmails: { setup24h: '2026-02-02T00:00:00.000Z' },
  notification_prefs: { digest: 'weekly-fixture' },
};

/** A stub Base44 that answers the single-record admin GET with `body`. */
const stubFetch = (body, { ok = true } = {}) => {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    return { ok, json: async () => body };
  };
  impl.calls = calls;
  return impl;
};

export async function runGuestSiteCurrency() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE OWNER'S CODE IS RESOLVED, AND ONLY AS A CODE ─────────────────

  const aud = await resolveOwnerCurrency(WEDDING, 'admin-key', stubFetch(OWNER));
  ok('an owner on AUD resolves to AUD', aud === 'AUD', String(aud));
  ok('  and resolves to a bare string, never the user record',
     typeof aud === 'string', typeof aud);

  const noCurrency = await resolveOwnerCurrency(
    WEDDING, 'admin-key', stubFetch({ ...OWNER, currency: undefined }));
  ok('an owner with no currency falls back to USD', noCurrency === 'USD', String(noCurrency));

  // Written as data because the fallback is the whole safety story: every
  // unusable value has to land on USD rather than reach a guest as a symbol.
  const WEIRD = [
    [' aud ', 'AUD', 'padded and lowercase is still a code'],
    ['eur', 'EUR', 'lowercase'],
    ['EURO', 'USD', 'four letters is not a code'],
    ['E', 'USD', 'one letter is not a code'],
    ['', 'USD', 'empty string'],
    [null, 'USD', 'null'],
    [123, 'USD', 'a number'],
    [{ code: 'AUD' }, 'USD', 'an object that merely contains a code'],
  ];
  for (const [value, expected, why] of WEIRD) {
    const got = await resolveOwnerCurrency(WEDDING, 'admin-key', stubFetch({ ...OWNER, currency: value }));
    ok(`  ${why} resolves to ${expected}`, got === expected, `${JSON.stringify(value)} -> ${got}`);
  }

  const threw = await resolveOwnerCurrency(WEDDING, 'admin-key', async () => { throw new Error('network'); });
  ok('a failed read falls back to USD rather than throwing', threw === 'USD', String(threw));
  const notOk = await resolveOwnerCurrency(WEDDING, 'admin-key', stubFetch(OWNER, { ok: false }));
  ok('  and a non-ok response does too', notOk === 'USD', String(notOk));

  // No key and no owner id both mean "do not call Base44 at all". Asserted on
  // the stub's call log, because "returned USD" alone would also be true of a
  // version that made the request and ignored it.
  const noKey = stubFetch(OWNER);
  ok('with no admin key it resolves to USD and makes no request',
     (await resolveOwnerCurrency(WEDDING, '', noKey)) === 'USD' && noKey.calls.length === 0,
     `${noKey.calls.length} request(s)`);
  const noOwner = stubFetch(OWNER);
  ok('with no owner on the wedding it resolves to USD and makes no request',
     (await resolveOwnerCurrency({ ...WEDDING, created_by_id: undefined }, 'k', noOwner)) === 'USD'
       && noOwner.calls.length === 0,
     `${noOwner.calls.length} request(s)`);

  // ── 2. THE PAYLOAD CARRIES NO OTHER User FIELD ──────────────────────────
  //
  // The central check of the item. Built by difference rather than by listing
  // what must be absent: whatever `currency` added, it added exactly one key.
  // A list of forbidden keys only ever catches the leaks its author imagined,
  // which is the mistake this goal already made once on the dashboard.
  const before = pickGuestSafeFields(WEDDING);
  const after = pickGuestSafeFields(WEDDING, { currency: aud });
  const added = Object.keys(after).filter(k => !(k in before));
  ok('the currency adds exactly one key to the guest payload',
     added.length === 1 && added[0] === 'currency', added.join(', ') || 'nothing');
  ok('  and that key is the code itself', after.currency === 'AUD', String(after.currency));

  // The deep scan looks for the VALUES, so it fails whether a later edit
  // spreads the user object, nests it, or renames the key on the way through.
  const serialized = JSON.stringify(after);
  const leaked = Object.entries(OWNER)
    .filter(([k]) => k !== 'currency')
    .filter(([, v]) => typeof v === 'string' && serialized.includes(v))
    .map(([k]) => k);
  ok('no other value from the owner record appears anywhere in the payload',
     leaked.length === 0, leaked.length ? leaked.join(', ') : 'clean');
  ok('  and no User-only key appears either',
     !['email', 'plan', 'planActivatedAt', 'role', 'full_name', 'lifecycleEmails', 'retentionEmails', 'notification_prefs']
       .some(k => k in after),
     'absent');

  // An unresolved currency must OMIT the key, not set it to USD: an absent key
  // renders exactly as the page did before this change, and that is the
  // promised behavior for an older cached payload.
  ok('an unresolved currency omits the key entirely', !('currency' in before), 'key absent');
  const badCode = pickGuestSafeFields(WEDDING, { currency: 'dollars' });
  ok('  and a value that is not a three-letter code is refused at the payload too',
     !('currency' in badCode), 'key absent');

  // ── 3. THE SERVER ACTUALLY RESOLVES IT ON THE GUEST ROUTE ───────────────
  //
  // The two halves above are pure. This one is why they matter: an endpoint
  // that never calls resolveOwnerCurrency would pass every check so far.
  const bySlug = code('api/wedding-by-slug.js');
  ok('the guest route resolves the owner currency',
     /resolveOwnerCurrency\s*\(/.test(bySlug), 'called');
  ok('  and passes it into the allowlist, not around it',
     /pickGuestSafeFields\s*\(\s*wedding\s*,\s*\{\s*currency\s*\}/.test(bySlug), 'one argument');

  // ── 4. THE PAGE RENDERS THE SYMBOL IT WAS GIVEN ─────────────────────────

  const page = code(REGISTRY_PAGE);
  ok('the registry page reads the currency off the payload',
     /weddingDetails\.currency/.test(page), 'weddingDetails.currency');
  ok('  and formats with the same helper the dashboard uses',
     /from\s+'@\/lib\/money'/.test(page) && /formatMoney\s*\(/.test(page), 'formatMoney');
  ok('  the cash-fund goal goes through it',
     /formatMoney\(\s*fund\.requested_amount\s*,\s*currency\s*\)/.test(page), 'requested_amount');
  ok('  and so does the wishlist price',
     /formatMoney\(\s*product\.price\s*,\s*currency\s*\)/.test(page), 'price');

  // By elimination, the way the dashboard check had to be rewritten: strip the
  // backtick strings, and any `${` left in the file is JSX printing a literal
  // dollar sign next to an expression. A list of the shapes I thought of
  // missed three real ones on the dashboard.
  const withoutTemplates = page.replace(/`(?:[^`\\]|\\.)*`/g, '``');
  const hardcoded = /\$\{[^}]*(?:toLocaleString|amount|price|total|value)/.test(withoutTemplates);
  ok('no hardcoded dollar sign is left in front of a figure on the page',
     !hardcoded, hardcoded ? 'found one' : 'none');

  // ── 5. WHAT A GUEST ACTUALLY READS ──────────────────────────────────────
  //
  // The figures, end to end, for the two cases the owner named. Same stored
  // number, so the digits must be identical and only the symbol may differ:
  // this is the dashboard's property, restated on the guest surface.
  const STORED = 2500;
  const onAud = formatMoney(STORED, after.currency);
  const onNothing = formatMoney(STORED, before.currency);
  ok('an owner on AUD shows A$2,500 on the registry', onAud === 'A$2,500', onAud);
  ok('an owner with no currency shows $2,500, as today', onNothing === '$2,500', onNothing);
  ok('  and the digits are the same either way, only the symbol moves',
     onAud.replace(/[^\d,]/g, '') === onNothing.replace(/[^\d,]/g, ''),
     `${onAud} / ${onNothing}`);
  ok('a euro owner shows the euro symbol', formatMoney(STORED, 'EUR') === '€2,500',
     formatMoney(STORED, 'EUR'));

  return results;
}
