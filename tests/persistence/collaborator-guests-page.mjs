/**
 * tests/persistence/collaborator-guests-page.mjs
 *
 * A COLLABORATOR OPENING GUESTS SEES THE LIST, NOT "TEMPORARILY UNAVAILABLE".
 *
 * Fix batch 1, item 3. #1002 made api/collaborator-guests.js serve GET to a
 * collaborator with view on Guests (driven in collaborator-guests-view.mjs).
 * The page never caught up: Guests.jsx still kept the parked-era branch that
 * turned any 503 into "Collaborator guest access is temporarily unavailable,
 * check back after launch" in place of the list. The endpoint has no 503 of
 * its own any more, so the only thing that branch could do was report a
 * platform hiccup as a feature that does not exist.
 *
 * WHAT IS NOT WIDENED is checked too, because a fix here must not be read as
 * a looser page: the collaborator session stays read-only whatever the grant
 * says, the list still comes from the one endpoint that checks the grant, and
 * that endpoint still asks for view on Guests and refuses every write.
 *
 * The plant: put the `res.status === 503` branch back in loadGuests and the
 * first check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'), { trailing: true });

export function runCollaboratorGuestsPage() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  console.log('\n  The collaborator Guests page shows what the endpoint serves:\n');

  const page = code('src/pages/Guests.jsx');
  const load = page.slice(page.indexOf('const loadGuests = async'), page.indexOf('const handleTableAssignment'));
  ok('loadGuests has no parked 503 branch', !/503/.test(load), 'no 503 in the collaborator read');
  ok('  and the page carries no "temporarily unavailable" state',
     !/temporarily unavailable/i.test(page) && !/collaboratorGuestsUnavailable/.test(page), 'copy and state gone');
  ok('  the collaborator list still comes from /api/collaborator-guests for that owner',
     /fetch\(`\/api\/collaborator-guests\?ownerUserId=\$\{encodeURIComponent\(collab\.ownerUserId\)\}`/.test(load), 'one endpoint');
  ok('  and a refused read is a load failure, never a silent empty list',
     /if \(!res\.ok\) throw new Error\('Failed to load guests'\)/.test(load), 'throws to the error toast');
  const listAt = page.indexOf('<GuestList');
  const beforeList = page.slice(Math.max(0, listAt - 900), listAt);
  ok('the GuestList is rendered for a collaborator, not swapped for a notice',
     listAt !== -1 && !/isCollaborating\s*&&[^?]*\?\s*\(/.test(beforeList), '<GuestList with no collaborator ternary ahead of it');
  ok('  and the session stays read-only whatever the grant says',
     /const readOnly = isCollaborating;/.test(page), 'readOnly = isCollaborating');

  const api = code('api/collaborator-guests.js');
  ok('the endpoint answers no 503 of its own', !/status\(503\)/.test(api), 'no res.status(503)');
  ok('  it still requires view on Guests', /hasPagePermission\(collaboration\.permissions, PAGE, 'view'\)/.test(api) && /const PAGE = 'Guests'/.test(api), "PAGE 'Guests', 'view'");
  ok('  and still refuses every method but GET', /if \(req\.method !== 'GET'\) \{\s*return res\.status\(403\)/.test(api), 'PUT and DELETE 403');

  return results;
}
