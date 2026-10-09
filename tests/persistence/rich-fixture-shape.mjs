/**
 * tests/persistence/rich-fixture-shape.mjs
 *
 * THE RICH RECORDING FIXTURE IS THE WEDDING THE GOAL DESCRIBES, AND STAYS IT.
 *
 * scripts/lib/fixtures/richWedding.mjs is what every studio tour recording and
 * every /tour clip is filmed from. A count that drifts is footage that no
 * longer matches what the marketing site says about it, so the shape is pinned
 * here: the numbers in goals/2026-10-07-rich-recordings-and-tour-page.md item
 * 2, and the rules that keep it fiction (example.com addresses, phone numbers
 * from the ACMA range reserved for fiction, no channel the product dropped).
 *
 * Offline: it builds the fixture in memory and reads nothing else.
 */
import { RICH, RICH_COUNTS, buildRichWedding } from '../../scripts/lib/fixtures/richWedding.mjs';
import { fixtureFor } from '../../scripts/lib/renderHarness.mjs';
import { assertSeedMatchesSchemas } from '../../scripts/lib/seedSchema.mjs';
import { pass, fail } from './_shared.mjs';

const FICTION_MOBILE = /^\+61491(57[0-9])\d{3}$/;

export function runRichFixtureShape() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The rich recording fixture, built in memory:\n');

  const { seed, published, user } = RICH;
  const G = seed.Guest;
  const wd = seed.WeddingDetails[0];

  // ── the counts the goal names ─────────────────────────────────────────
  check('212 guests', G.length === RICH_COUNTS.guests && G.length === 212, `${G.length}`);
  const invitations = new Set(G.map((g) => (typeof g.household_id === 'string' && g.household_id.trim()) || g.id)).size;
  check('140 invitations, counted the way the household resolver counts', invitations === 140, `${invitations}`);
  const children = G.filter((g) => g.is_child === true);
  check('24 children, each with an age', children.length === 24 && children.every((g) => Number.isInteger(g.child_age)),
    `${children.length} children, ${children.filter((g) => !Number.isInteger(g.child_age)).length} without an age`);
  check('no solo guest carries a household_id', G.every((g) => !g.household_id || G.filter((x) => x.household_id === g.household_id).length > 1));
  const replied = G.filter((g) => g.rsvp_status !== 'pending').length / G.length;
  check('about 65 percent replied (60 to 70)', replied >= 0.6 && replied <= 0.7, `${(replied * 100).toFixed(1)}%`);
  const attending = G.filter((g) => g.rsvp_status === 'attending');
  check('every attending guest has a meal', attending.every((g) => g.meal_choice), `${attending.length} attending`);
  check('some dietary notes', G.filter((g) => g.dietary_restrictions).length >= 10);

  const events = [...(wd.preWeddingEvents || []), ...(wd.postWeddingEvents || [])];
  check('two main events and three custom ones', !!wd.mainCeremony && !!wd.reception && events.length === 3,
    `${events.length} custom`);
  check('every guest carries a response for all five events', G.every((g) => g.event_responses?.length === 5));

  check('18 tables', seed.Table.length === 18, `${seed.Table.length}`);
  const seated = G.filter((g) => g.table_assignment).length;
  const seatable = G.filter((g) => g.rsvp_status !== 'declined').length;
  check('most guests seated (over 80 percent of those not declined)', seated / seatable > 0.8, `${seated} of ${seatable}`);
  const tableNames = new Set(seed.Table.map((t) => t.name));
  check('a seat names its table the way the Guests page reads it', G.filter((g) => g.table_assignment).every((g) => tableNames.has(g.table_assignment)));

  check('25 budget lines', seed.Budget.length === 25, `${seed.Budget.length}`);
  check('a 14-item run sheet', seed.Schedule.length === 14, `${seed.Schedule.length}`);
  check('30 tasks, some done', seed.Task.length === 30 && seed.Task.some((t) => t.completed) && seed.Task.some((t) => !t.completed));
  check('three guest notes and two song requests', seed.GuestMessage.length === 3 && seed.SongRequest.length === 2);
  check('a moodboard of stock already in the account', seed.MoodboardItem.length > 0
    && seed.MoodboardItem.every((m) => m.image_url.startsWith('https://res.cloudinary.com/dsr84xknv/image/upload/')));
  check('a published site in one universe', wd.websiteEnabled === true && typeof published.activeUniverse === 'string');
  const days = Math.round((new Date(wd.weddingDate) - Date.now()) / 86400000);
  check('the wedding is six weeks out', days >= 41 && days <= 43, `${days} days`);

  // ── fiction, and the product as it is ─────────────────────────────────
  const emails = G.map((g) => g.email).filter(Boolean);
  check('every guest email is @example.com', emails.every((e) => e.endsWith('@example.com')), `${emails.length} emails`);
  const phones = G.map((g) => g.phone).filter(Boolean);
  check('every phone number is in the range reserved for fiction', phones.every((p) => FICTION_MOBILE.test(p)), `${phones.length} phones`);
  check('no WhatsApp anywhere in it', !JSON.stringify(RICH).toLowerCase().includes('whatsapp'));
  check('invitations went by email', G.every((g) => g.invite_channel === 'email'));
  check('the account is AUD and day-first', user.currency === 'AUD' && user.dateFormat === 'dmy');

  // ── deterministic, valid, selectable, and the default untouched ───────
  const at = Date.UTC(2026, 9, 9, 2);
  check('two builds at the same clock are identical',
    JSON.stringify(buildRichWedding({ now: at })) === JSON.stringify(buildRichWedding({ now: at })));
  let drift = null;
  try { drift = assertSeedMatchesSchemas(seed, { WeddingDetails: [published] }); } catch (e) { drift = e; }
  check('every field is a real entity field', Array.isArray(drift), Array.isArray(drift) ? `${drift.length} known drift` : String(drift.message).split('\n')[1]);
  check('the harness serves it as fixture "rich"', fixtureFor('rich').seed === seed && fixtureFor('rich').user === user);
  check('and the default fixture is a different wedding', fixtureFor().seed !== seed && fixtureFor().seed.WeddingDetails[0].slug !== wd.slug);

  return r;
}
