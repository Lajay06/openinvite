/**
 * The ceremony venue keeps its picture.
 *
 * ── THE SYMPTOM THE OWNER SAW ──────────────────────────────────────────────
 *
 * On Event details, the Reception card showed a photograph of its venue and
 * the Ceremony card showed none. Never the other way round, on every wedding.
 *
 * ── WHY IT WAS ALWAYS THAT WAY ROUND ───────────────────────────────────────
 *
 * Both venues are picked with the same component. VenueSearchPanel's
 * handleSelect emits five fields — name, address, placeId, mapsUrl and a
 * photoUrl built from the Places photo_reference. The Event details form keeps
 * all five on the way to the record. buildWeddingDetailsPayload kept two.
 *
 * The reception venue can ONLY be set from the Event details form. The
 * ceremony venue is set at onboarding, by every couple, once. So the field
 * that survived and the field that did not were decided by which form wrote
 * them, and the couple had no way to tell: an absent photo is indistinguishable
 * from a venue that has none.
 *
 * ── WHAT ELSE WAS LOST WITH IT ─────────────────────────────────────────────
 *
 * mainCeremony.photoUrl is not the card's alone. It is the invitation email's
 * venue banner (SendInvitesModal's getDefaultBannerChoice and EmailTemplates'
 * bannerPhotos) and the Universe studio's venue image. One dropped field, three
 * features degraded, no error anywhere. placeId went with it, which is what a
 * later lookup would have needed to fetch the photo back.
 *
 * This guard pins the payload shape, both venue inputs, and the three readers,
 * so the field cannot be dropped again by a payload edit that looks harmless.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
// NAMESPACE IMPORT ON PURPOSE. A named import of a helper the module does not
// export yet is a module-resolution error, which aborts the whole run before a
// single check prints — a red CI that names no property. Read off the namespace
// and the missing export fails as its own check, with the others still shown.
import * as onboardingSave from '../../src/lib/onboardingSave.js';
const { buildWeddingDetailsPayload } = onboardingSave;
const buildCeremonyVenue = onboardingSave.buildCeremonyVenue || (() => ({}));

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PANEL = strip(read('src/components/shared/VenueSearchPanel.jsx'));
const EVENTS = strip(read('src/pages/EventDetails.jsx'));
const STEP3 = strip(read('src/components/onboarding/OnboardingStep3Location.jsx'));

/** What VenueSearchPanel hands back when a Places result is chosen. */
const PICKED = {
  name: 'The Old Observatory',
  address: '12 Hill Road, Sausalito, CA',
  placeId: 'ChIJ_observatory',
  mapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJ_observatory',
  photoUrl: '/api/places-photo?ref=ATtYBw_ref_string&maxwidth=600',
};

export async function runVenuePhotoSurvivesOnboarding() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The ceremony venue keeps its picture — every field the picker returns is saved:\n');

  // ── 1. The payload, against the object the picker actually emits ──────────
  const picked = buildWeddingDetailsPayload({ venue: { ...PICKED }, location: 'Sausalito' });
  const mc = picked.mainCeremony || {};

  check('a picked venue keeps its name', mc.venueName === PICKED.name, mc.venueName || '(missing)');
  check('a picked venue keeps its address', mc.address === PICKED.address, mc.address || '(missing)');
  check('  and its photo — the field the card, the email banner and the studio all read',
    mc.photoUrl === PICKED.photoUrl, mc.photoUrl || '(dropped)');
  check('  and its maps link', mc.mapsUrl === PICKED.mapsUrl, mc.mapsUrl || '(dropped)');
  check('  and its place id, which is how the photo could ever be fetched back',
    mc.placeId === PICKED.placeId, mc.placeId || '(dropped)');

  // ── 2. A typed venue clears the three rather than leaving stale ones ──────
  const typed = buildWeddingDetailsPayload({ venue: 'A friend’s garden', location: 'Hobart' });
  const tm = typed.mainCeremony || {};
  check('a typed venue still records the name and the city',
    tm.venueName === 'A friend’s garden' && tm.address === 'Hobart', `${tm.venueName} / ${tm.address}`);
  check('  and nulls the three Places fields rather than leaving the old venue’s',
    tm.photoUrl === null && tm.mapsUrl === null && tm.placeId === null, 'photo, maps and place id all null');

  // ── 2b. Before the venue step, the key is not written at all ──────────────
  const early = buildWeddingDetailsPayload({ couple1Name: 'Ada' });
  check('an early draft save omits mainCeremony rather than sending blanks over it',
    early.mainCeremony === undefined && !('mainCeremony' in JSON.parse(JSON.stringify(early))),
    'key dropped from the body');

  // ── 3. The helper is the one place the shape is decided ───────────────────
  const direct = buildCeremonyVenue({ venue: { ...PICKED } });
  check('buildCeremonyVenue is exported and returns the same five fields',
    Object.keys(direct).sort().join(',') === 'address,mapsUrl,photoUrl,placeId,venueName',
    Object.keys(direct).sort().join(','));
  check('  and the payload uses it rather than inlining the mapping twice',
    /mainCeremony: buildCeremonyVenue\(data\)/.test(strip(read('src/lib/onboardingSave.js'))),
    'one mapping');

  // ── 4. Both venue inputs are the same component ───────────────────────────
  check('the picker emits a photoUrl from the Places photo_reference',
    /photoUrl: place\.photo_reference \? photoProxy\(place\.photo_reference\)/.test(PANEL), 'handleSelect');
  check('onboarding’s venue step uses that picker, not its own field',
    /<VenueSearchPanel/.test(STEP3), 'OnboardingStep3Location');
  check('the event form uses the same picker', /<VenueSearchPanel/.test(EVENTS), 'EventForm');

  // ── 5. The event form keeps all five on the way to the record ─────────────
  check('the fixed-event save carries photoUrl', /photoUrl:\s*form\.venue\?\.photoUrl/.test(EVENTS), 'handleSave');
  check('  and the custom-event save carries venuePhotoUrl',
    /venuePhotoUrl:\s*form\.venue\?\.photoUrl/.test(EVENTS), 'handleSave');
  check('  and the record write keeps photoUrl on mainCeremony/reception',
    /photoUrl:\s*saved\.photoUrl/.test(EVENTS), 'handleSaveEvent');

  // ── 6. The card reads it for both shapes ──────────────────────────────────
  check('the card reads photoUrl for a fixed event and venuePhotoUrl for a custom one',
    /isFixed \? \(event\?\.photoUrl \|\| null\) : \(event\?\.venuePhotoUrl \|\| event\?\.photoUrl \|\| null\)/.test(EVENTS),
    'EventCardRow');

  // ── 7. The three readers that would have gone quiet ───────────────────────
  const INVITES = strip(read('src/components/guests/SendInvitesModal.jsx'));
  const TEMPLATES = strip(read('src/components/guests/EmailTemplates.jsx'));
  const STUDIO = strip(read('src/pages/UniverseStudio.jsx'));
  check('the invitation banner still reads mainCeremony.photoUrl',
    /venuePhotoUrl: wedding\??\.?\.?mainCeremony\?\.photoUrl/.test(INVITES), 'SendInvitesModal');
  check('the email template preview reads it', /mainCeremony\?\.photoUrl/.test(TEMPLATES), 'EmailTemplates');
  check('the universe studio reads it', /mainCeremony\?\.photoUrl/.test(STUDIO), 'UniverseStudio');

  return results;
}
