/**
 * tests/persistence/ava-update-by-id.mjs
 *
 * THE SAME DEFECT AS THE TICK-OFF, ON THE OTHER TWO UPDATES.
 *
 * update_todo failed every time because the prompt asked for an id and the
 * context sent titles. update_vendor and update_guest carried the identical
 * shape and were flagged when that was found:
 *
 *   avaRequest.js  'update_vendor needs id.'   'update_guest needs id.'
 *   avaContextFormat.js  vendor lines were "Name (category) — status, quoted $X"
 *                        guest lines were  "Name — attending, table 4"
 *
 * No id in either. So the id was invented, Vendor.update / Guest.update 404'd,
 * and the throw surfaced as a card reading "Could not do that".
 *
 * FIXED THE WAY THE ADVISOR ASKED — send ids with the names, resolve by id —
 * rather than by title-matching as the to-do does. A vendor and a guest are
 * rows the couple can see listed with their ids in the same breath; a to-do is
 * something they name out loud mid-sentence. The two actions get the cheaper
 * mechanism and the stricter check.
 *
 * A MISS IS STILL NAMED. "I could not find a vendor called Fleur & Stem" is a
 * sentence a couple can act on; a hex id is not.
 */
import { pass, fail } from './_shared.mjs';
import { executeAvaAction } from '../../src/lib/avaExecute.js';
import { formatWeddingContext } from '../../src/lib/avaContextFormat.js';

const VENDORS = [
  { id: 'v1', name: 'Fleur & Stem', category: 'flowers', status: 'quoted', quoted_price: 2000 },
  { id: 'v2', name: 'Bright Lens', category: 'photography', status: 'booked' },
];
const GUESTS = [
  { id: 'g1', name: 'Jon Smith', rsvp_status: 'attending' },
  { id: 'g2', name: 'Pia Rao',   rsvp_status: 'pending' },
];

async function run(type, data) {
  const wrote = [];
  const deps = {
    listVendors: async () => VENDORS,
    listGuests: async () => GUESTS,
    updateGuest: async (id, fields) => { wrote.push({ id, fields }); },
    entities: { Vendor: { update: async (id, fields) => { wrote.push({ id, fields }); } } },
  };
  try {
    const out = await executeAvaAction({ type, data }, deps);
    return { ...out, wrote };
  } catch (err) {
    return { ok: false, threw: err.message, error: null, wrote };
  }
}

export async function runAvaUpdateById() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A vendor and a guest update land on a row that exists:\n');

  // ── THE CONTEXT CARRIES THE IDS ─────────────────────────────────────────
  {
    // wd carries names, date and address so formatWeddingContext never falls
    // through to its localStorage fallbacks — there is no browser here, and
    // that is the same reason ava-reads-the-wedding.mjs seeds them.
    const ctx = formatWeddingContext({
      vendors: VENDORS,
      guests: [
        { ...GUESTS[0], plus_one_attending: true, plus_one_name: 'Ines Fell' },
        GUESTS[1],
      ],
      wd: { couple1Name: 'Ada', couple2Name: 'Alan', weddingDate: '2027-07-03',
            mainCeremony: { address: 'Greenwich' } },
      user: {},
    });
    check('PLANT: every vendor line carries its id',
      VENDORS.every(v => ctx.includes(`[id ${v.id}]`)), 'so the model has one to send back');
    check('PLANT: every guest line carries its id',
      GUESTS.every(g => ctx.includes(`[id ${g.id}]`)), 'same defect, same fix');
    check('  and a plus-one does not, because it is not a row',
      !/plus-one of[^\n]*\[id /.test(ctx),
      'writing to a plus-one\'s "id" would write to its host');
  }

  // ── UPDATE_VENDOR ───────────────────────────────────────────────────────
  {
    // The name is what the couple SAID, which need not be the row's full name
    // — "book Fleur" against a vendor stored as "Fleur & Stem". Carried here
    // deliberately: with no name in the payload the rename check below would
    // pass whether or not the guard against it existed.
    const good = await run('update_vendor', { id: 'v1', name: 'Fleur', status: 'booked' });
    check('PLANT: a real vendor id writes',
      good.ok === true && good.wrote[0]?.id === 'v1', good.ok ? 'wrote v1' : (good.error || good.threw));
    const bad = await run('update_vendor', { id: 'vendor_1', name: 'Fleur & Stem', status: 'booked' });
    check('PLANT: an invented vendor id is refused, and the vendor is named',
      bad.ok === false && bad.error === 'I could not find a vendor called "Fleur & Stem".' && bad.wrote.length === 0,
      bad.error || bad.threw);
    const nameless = await run('update_vendor', { id: 'vendor_1', status: 'booked' });
    check('  and with no name to report, it says which question it could not answer',
      nameless.ok === false && /could not tell which vendor/.test(nameless.error || ''),
      nameless.error || nameless.threw);
    check('  a resolved update does not rewrite the name it was found by',
      good.wrote[0]?.fields?.name === undefined && good.wrote[0]?.fields?.status === 'booked',
      '"Fleur" found "Fleur & Stem"; it must not become "Fleur"');
  }

  // ── UPDATE_GUEST ────────────────────────────────────────────────────────
  {
    const good = await run('update_guest', { id: 'g1', rsvp_status: 'declined' });
    check('PLANT: a real guest id writes',
      good.ok === true && good.wrote[0]?.id === 'g1', good.ok ? 'wrote g1' : (good.error || good.threw));
    const bad = await run('update_guest', { id: 'guest_1', name: 'Jon Smith', rsvp_status: 'declined' });
    check('PLANT: an invented guest id is refused, and the guest is named',
      bad.ok === false && bad.error === 'I could not find a guest called "Jon Smith".' && bad.wrote.length === 0,
      bad.error || bad.threw);
    check('  and nothing is written on the way to refusing',
      bad.wrote.length === 0, 'a half-applied refusal is worse than the bug');
  }

  // ── THE VALIDATION GATE IS STILL IN FRONT OF ALL OF IT ──────────────────
  {
    const enumBad = await run('update_vendor', { id: 'v1', category: 'not-a-category' });
    check('an out-of-enum value still refuses before the row is even looked up',
      enumBad.ok === false && /cannot be "not-a-category"/.test(enumBad.error || ''),
      enumBad.error || enumBad.threw);
  }

  return results;
}
