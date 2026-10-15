/**
 * tests/persistence/features-rows.mjs
 *
 * /features, AS THE OWNER RULED IT ON 2026-10-16. Read from source, offline.
 *
 *   - Replies and Seating are built exactly like the quick start wizard: the
 *     wizard and both rows render through one component, FeatureRow, a photo
 *     on one half and a solid panel on the other, with nothing over the photo
 *     but the wizard's own wash
 *   - the copy is the owner's, verbatim
 *   - between them they take Advanced guest management's place, and the page
 *     alternates black and white: quick start black, dashboard white, the app
 *     black (it was cream), timeline white, replies black, seating white,
 *     budget black
 *   - the Ultra badge sits beside a title only where the plan gating in code
 *     holds the feature to Ultra, and the gating it rests on is still there
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export function runFeaturesRows() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  /features rows:\n');

  const page = stripComments(read('src/pages/Features.jsx'));
  const row = stripComments(read('src/components/marketing/FeatureRow.jsx'));
  const rows = [...page.matchAll(/<FeatureRow\s+name="([\w-]+)"\s+ground="(\w+)"\s+photo="(\w+)"/g)].map((m) => ({ name: m[1], ground: m[2], photo: m[3] }));
  check('the wizard, Replies and Seating all render through FeatureRow', ['quick-start', 'replies', 'seating'].every((n) => rows.some((x) => x.name === n)), rows.map((x) => x.name).join(', '));
  check('FeatureRow is the wizard: the shared heading with its rule, the wizard body type, a photo half and a solid half',
    /<FeatureSectionHeading color=\{g\.heading\}>/.test(row) && /\.\.\.featureBodyTextStyle/.test(row) && /lg:w-1\/2/.test(row) && /background: "#0A0A0A"/.test(row) && /background: "#FFFFFF"/.test(row));
  const absolutes = (row.match(/position: "absolute"/g) || []).length;
  check('nothing floats over the photo: only the image and the wizard\'s wash are placed on it', absolutes === 2 && /tint \?/.test(row) && (page.match(/tint=/g) || []).length === 1);

  check('Replies, verbatim', page.includes('heading="Watch the yeses roll in."') && page.includes('body="Every guest gets their own link. They RSVP in seconds, pick their meal, request a song (yes, ABBA counts) and it all lands in your guest list, sorted by household."'));
  check('Seating, verbatim', page.includes('heading="Seating, minus the drama."') && page.includes('body="Drag guests to tables and the rest sorts itself out: meals go to the caterer, names go on the place cards, and the plan goes to every phone on the day."'));
  check('Replies shows the woman reading her phone (038); Seating the lantern-lit dinner table, not the crowd',
    /REPLIES_PHOTO = responsivePhoto\("hf_20260905_124238_2e0981ad-2b66-46cc-948d-a8db441b4929_whdhah"/.test(page) && /SEATING_PHOTO = responsivePhoto\("pin_kyoto_party"/.test(page) && !/pin_london_party/.test(page));
  check('Advanced guest management is gone, its two jobs now the two rows', !/FeatureGuests/.test(page) && !existsSync(join(ROOT, 'src/components/home/FeatureGuests.jsx')));

  // ── the alternation ────────────────────────────────────────────────────
  const at = (needle) => page.indexOf(needle);
  const order = ['<QuickStartSection', '<DashboardSection', '<FeaturesAppSection', '<AccordionSection', '<FeatureTimeline', 'name="replies"', 'name="seating"', '<FeatureBudget'];
  const pos = order.map(at);
  check('the order: quick start, dashboard, the app, accordion, timeline, replies, seating, budget', pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), pos.join(' '));
  const app = stripComments(read('src/components/marketing/FeaturesAppSection.jsx'));
  const grounds = {
    quick: rows.find((x) => x.name === 'quick-start')?.ground,
    app: /const PANEL = "#0A0A0A"/.test(app) ? 'black' : 'other',
    replies: rows.find((x) => x.name === 'replies')?.ground,
    seating: rows.find((x) => x.name === 'seating')?.ground,
  };
  const timelineWhite = /background: "#FFFFFF"/.test(read('src/components/home/FeatureTimeline.jsx'));
  const budgetBlack = /background: "#0A0A0A"/.test(read('src/components/home/FeatureBudget.jsx'));
  check('black and white alternate: wizard black, the app black (no cream), timeline white, replies black, seating white, budget black',
    grounds.quick === 'black' && grounds.app === 'black' && timelineWhite && grounds.replies === 'black' && grounds.seating === 'white' && budgetBlack && !/#F6F2EC/i.test(app), JSON.stringify(grounds));

  // ── the Ultra badge, from the gating in code ───────────────────────────
  const badged = rows.filter((x) => new RegExp(`name="${x.name}"[^>]*\\bultra\\b`).test(page.replace(/\n\s*/g, ' '))).map((x) => x.name);
  check('the Ultra badge sits beside Replies, and nowhere else on /features', JSON.stringify(badged) === '["replies"]' && !/PlanBadge/.test(page), badged.join(', '));
  const journey = read('src/lib/journeySteps.js');
  check('  because the RSVP step is Ultra-gated in journeySteps.js',
    /key: 'rsvp',[\s\S]*?ultraGated: true,/.test(journey.slice(journey.indexOf("key: 'rsvp'"), journey.indexOf("key: 'publish'"))));
  check('  and the guest\'s meal choice is behind MealOptionsUltraGate in FoodBeverage.jsx, and ultra: true in the app',
    /<MealOptionsUltraGate \/>/.test(read('src/pages/FoodBeverage.jsx')) && /title: 'Guest meal options'[^}]*ultra: true/.test(read('src/mobile/features/schemas.js')));
  check('  the badge is the product\'s own PlanBadge, plan ultra', /<PlanBadge plan="ultra"/.test(row));
  return r;
}
