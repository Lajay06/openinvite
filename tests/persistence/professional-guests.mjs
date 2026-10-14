/**
 * tests/persistence/professional-guests.mjs
 *
 * Openinvite Professional: the Guests panel, the standalone importer and the
 * linked feed endpoint. goals/2026-10-14-professional.md, item 10, Privacy,
 * and stop condition 6 ("any path where a professional could see a guest's
 * email, phone or address, or any couple data without a live link").
 *
 * The endpoint is checked in source for ORDER, because order is the rule:
 * nothing of the couple's is read before the role and the live link are
 * proved, the couple is the account that approved, the allowlist is
 * re-checked before the response leaves, and the read is logged first.
 *
 * PLANT (R19): an importer that keeps an "E-mail Address" column must fail
 * the same check.
 */
import { readFileSync } from 'node:fs';
import { pass, fail, stripComments } from './_shared.mjs';
import { importGuests, droppedLine, catererSheet, panelFigures, parseCsv, CONTACT_HEADER } from '../../src/lib/professionalGuests.js';

const CSV = [
  'First Name,Last Name,E-mail Address,Mobile,Street,Zip,RSVP,Meal,Dietary / allergies,Table,Plus one,Kid,Favorite color',
  'Ava,Chen,ava@example.com,+1 415 555 0101,1 Main St,94103,Yes,Salmon,"Shellfish, severe",Table 1,yes,,Blue',
  'Leo,"Chen ""Junior""",leo@example.com,0400 000 000,2 Main St,94103,Declined,,,,,,',
  'Mia,Chen,,,,,,Kids pasta,Nut allergy,Table 1,,yes,',
].join('\r\n');

export function runProfessionalGuests(importer = importGuests) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, guests, the importer and the feed endpoint:\n');

  const res = importer(CSV);
  const json = JSON.stringify(res.guests);
  check('professional guests: the importer keeps no email, phone or address, however the column is spelled', !/@|555|0400|Main St|94103/.test(json) && res.guests.every((g) => Object.keys(g).every((k) => !CONTACT_HEADER.test(k))), json.slice(0, 120));
  check('professional guests: it says which columns it left out', res.dropped.join() === 'E-mail Address,Mobile,Street,Zip' && /left out 4 columns: E-mail Address, Mobile, Street, Zip/.test(droppedLine(res.dropped)), droppedLine(res.dropped));
  check('professional guests: names, replies, meals, dietary needs, tables, plus-ones and children come through', res.guests.length === 3 && res.guests[0].name === 'Ava Chen' && res.guests[0].status === 'coming' && res.guests[1].status === 'not_coming' && res.guests[2].status === 'waiting' && res.guests[0].dietary === 'Shellfish, severe' && res.guests[0].plus_one && res.guests[2].child && res.guests[1].name === 'Leo Chen "Junior"', json.slice(0, 160));
  check('professional guests: a column it does not know is ignored, not kept', res.ignored.includes('Favorite color') && !json.includes('Blue'), res.ignored.join());
  check('professional guests: a file with no name column is refused, plainly', /name column/.test(importGuests('Email,Phone\na@b.co,1').error || ''), 'refused');
  check('professional guests: quoted commas and newlines parse', parseCsv('a,"b,c","d\ne"\r\n1,2,3').length === 2, 'two rows');

  const rows = [
    { name: 'Ava', status: 'coming', meal: 'Salmon', dietary: 'Shellfish', table: 'Table 2', plus_one: true },
    { name: 'Mia', status: 'coming', meal: 'Kids pasta', dietary: 'Nut allergy', table: 'Table 10', child: true },
    { name: 'Leo', status: 'coming', meal: 'Salmon', dietary: '', table: 'Table 1' },
    { name: 'Tom', status: 'waiting', meal: '', dietary: 'Vegan', table: '' },
  ];
  const sheet = catererSheet(rows);
  check('professional guests: the caterer sheet counts meals and lists needs by table, in table order', sheet.meals[0].join() === 'Salmon,2' && sheet.byTable.map((t) => t[0]).join() === 'Table 2,Table 10' && sheet.total === 4, JSON.stringify(sheet));
  check('professional guests: a guest still waiting is not on the caterer’s list', !JSON.stringify(sheet).includes('Vegan'), 'waiting left out');
  const f = panelFigures(rows);
  check('professional guests: the panel counts coming, waiting, plus-ones and children', f.coming === 3 && f.waiting === 1 && f.plus_ones === 1 && f.children === 1, JSON.stringify(f).slice(0, 80));

  const src = stripComments(readFileSync(new URL('../../api/professional/feed.js', import.meta.url), 'utf8'), { trailing: true });
  const at = (re) => src.search(re);
  const iAuth = at(/authorize\(\{ member, collection: 'PlannerLink'/);
  const iLive = at(/if \(!isLinkLive\(linkRows\)\) return/);
  const iRead = at(/await readCouple\(/);
  const iGuard = at(/forbiddenInFeed\(feed\)/);
  const iLog = at(/\/entities\/PlannerLinkView/);
  const iSend = at(/json\(\{ feed \}\)/);
  check('professional guests: the feed proves the role, then the live link, before reading anything of the couple’s', iAuth > 0 && iLive > iAuth && iRead > iLive, `authorize ${iAuth}, live ${iLive}, read ${iRead}`);
  check('professional guests: the couple is the account that made the approval, checked against its hash', /coupleUserId = approve\?\.created_by_id/.test(src) && /hmacHex\(coupleUserId\) !== approve\.couple_user_id_hash/.test(src), 'created_by_id and hash');
  check('professional guests: the allowlist is re-checked, and the read is logged, before the feed is sent', iGuard > iRead && iLog > iGuard && iSend > iLog && !/\.catch\(/.test(src.slice(iLog, iSend)), `check ${iGuard}, log ${iLog}, send ${iSend}`);
  check('professional guests: the feed endpoint sends no server error text', !/err\.message/.test(src), 'calm');

  if (importer === importGuests) {
    const planted = (text) => { const out = importGuests(text); const table = parseCsv(text); return { ...out, guests: out.guests.map((g, i) => ({ ...g, email: table[i + 1][2] })) }; };
    const p = JSON.stringify(planted(CSV).guests);
    check('PLANT: an importer that keeps the email column is told apart', /@/.test(p), 'planted keeps emails');
  }
  return r;
}
