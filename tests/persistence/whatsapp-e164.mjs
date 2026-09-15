/**
 * EVERY WHATSAPP LINK IS BUILT FROM ONE NORMALISER.
 *
 * Owner report: WhatsApp answers "this number is not on WhatsApp" for a guest
 * whose number was typed without a country code. It is right to — wa.me takes
 * E.164 and nothing else, and the product built that string three ways, none
 * of them correct:
 *
 *   SendInvitesModal.jsx:44   strip non-digits, send as-is
 *   WhatsAppCompose.jsx:109   strip, then prefix "61" unless it already starts
 *                             with "61" or "1" — so 0412 345 678 became
 *                             610412345678 (E.164 drops the trunk 0), and a US
 *                             number not starting with 1 got +61
 *   WhatsAppQRCode.jsx:8      no normalisation at all
 *
 * The three cases below are the owner's own, verbatim from the ruling. The
 * source checks that follow exist because a correct helper nobody calls fixes
 * nothing: this guard fails if any site goes back to hand-rolling the string.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toE164, toWaMe, needsCountryCode } from '../../src/lib/phoneE164.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export async function runWhatsappE164() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  WhatsApp — one normaliser, and a number it cannot read is not sent:\n');

  // ── THE OWNER'S THREE CASES ──────────────────────────────────────────────
  check('"0412 345 678" with AU becomes +61412345678',
    toE164('0412 345 678', 'AU') === '+61412345678', String(toE164('0412 345 678', 'AU')));
  check('  the trunk zero goes, which is what the old +61 prefix kept',
    toE164('0412 345 678', 'AU') !== '+610412345678', 'not +610412345678');
  check('"+44 7700 900123" is untouched',
    toE164('+44 7700 900123', 'AU') === '+447700900123', String(toE164('+44 7700 900123', 'AU')));
  check('  a number that declares its own country never gets a default over it',
    toE164('+1 212 555 0123', 'AU') === '+12125550123', String(toE164('+1 212 555 0123', 'AU')));
  check('"12345" is flagged, not guessed',
    toE164('12345', 'AU') === null && needsCountryCode('12345', 'AU') === true, 'null, and flagged');
  check('  an empty field is empty, not invalid',
    needsCountryCode('', 'AU') === false && needsCountryCode('   ', 'AU') === false, 'not flagged');

  // A US NUMBER GETS A US CODE. The old branch tested `startsWith("1")`, so
  // every US number that does not begin with 1 — which is most of them — was
  // given +61 in a product priced in USD.
  check('a US number with a US country selected becomes +1',
    toE164('2125550123', 'US') === '+12125550123', String(toE164('2125550123', 'US')));
  check('  and wa.me gets the digits with no plus',
    toWaMe('0412 345 678', 'AU') === '61412345678', String(toWaMe('0412 345 678', 'AU')));
  check('  while an unreadable number yields no link at all',
    toWaMe('12345', 'AU') === null, 'null');

  // ── EVERY SITE GOES THROUGH IT ───────────────────────────────────────────
  const SITES = [
    'src/components/guests/SendInvitesModal.jsx',
    'src/components/messages/WhatsAppCompose.jsx',
    'src/components/messages/WhatsAppQRCode.jsx',
  ];
  for (const p of SITES) {
    const src = code(p);
    check(`${p.split('/').pop()} builds its link from the helper`,
      /toWaMe\s*\(/.test(src), /toWaMe\s*\(/.test(src) ? 'toWaMe()' : 'no call to toWaMe');
    // THE OLD SHAPES, BY NAME. A file can import the helper and still hand-roll
    // the string beside it, which is how two of these three came to exist.
    check('  and hand-rolls none of it',
      !/replace\(\/\\D\/g/.test(src) && !/["']61["']\s*\+/.test(src),
      'no digit-strip, no hard-coded 61');
  }

  // ── AND THE COUPLE'S OWN FIELD IS NOT A BROWSER PROMPT ───────────────────
  const connect = code('src/components/messages/WhatsAppConnect.jsx');
  check('the couple types their number into the product, not into prompt()',
    !/(?<![.\w$])prompt\s*\(/.test(connect), 'no prompt()');
  check('  with a country picker beside it', /COUNTRY_CODES/.test(connect), 'COUNTRY_CODES');

  // ── THE DEAD FIELD IS NOT READ ───────────────────────────────────────────
  // GuestMessage.guest_phone is declared "Phone number of the guest for
  // WhatsApp" and is written by NOTHING in this repository, so the control it
  // gated could never appear.
  const messages = code('src/pages/Messages.jsx');
  check('Messages reads the guest\'s own number, not the field nothing writes',
    !/guest_phone/.test(messages) && /guestPhones/.test(messages), 'guest_phone unread');

  return results;
}
