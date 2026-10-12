/**
 * tests/persistence/collaborator-truthful-permissions.mjs
 *
 * EVERY COLLABORATOR PAGE IS VIEW ONLY, AND EVERYTHING SAYS SO.
 *
 * Item 5 of goals/2026-10-10-collaborators-safe-and-truthful.md, owner ruling
 * 2026-10-12: all eleven pages are offered, each view only. One "View only"
 * toggle per page and no edit control; the server honors view only, so canEdit
 * is false and a stale edit grant does nothing; the invite email lists the
 * pages by their nav labels and then "You can view these pages. You will not
 * be able to change anything."; Seating reads data.weddingDetails; the Help
 * article says what is true. Schedule and Moodboard edit arrive only with
 * their write PRs, by joining COLLABORATOR_EDIT_PAGES.
 *
 * The permission check and the email are DRIVEN. The picker, the accept page,
 * Seating and Help are read statically, with comments stripped.
 *
 * The plant: hasPagePermission honoring a grant's edit again turns the "edit
 * is false" checks red. Proven by hand and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => stripComments(fs.readFileSync(path.join(ROOT, p), 'utf8'), { trailing: true });

export async function runCollaboratorTruthfulPermissions() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const map = await import('../../src/lib/collaboratorPageMap.js');
  const { hasPagePermission } = await import('../../api/_lib/collaboratorAuth.js');
  const { renderCollaboratorInviteEmail } = await import('../../src/lib/collaboratorEmailTemplate.js');
  const keys = map.COLLABORATOR_PERMISSION_KEYS;

  console.log('\n  Every page is view only, on the server:\n');
  ok('the map offers all eleven pages', keys.length === 11, keys.join(', '));
  ok('  and no page is editable yet', map.COLLABORATOR_EDIT_PAGES.length === 0, 'Schedule and Moodboard wait for their write PRs');
  const all = Object.fromEntries(keys.map(k => [k, { view: true, edit: true }]));
  ok('a grant naming edit on every page: edit is false on every page',
     keys.every(k => hasPagePermission(all, k, 'edit') === false), 'stale edit does nothing');
  ok('  while view holds on every page', keys.every(k => hasPagePermission(all, k, 'view') === true), 'view kept');
  ok('an edit-only grant still reads as view', hasPagePermission({ Budget: { edit: true } }, 'Budget', 'view') === true, 'edit implies view');
  ok('a key outside the map grants nothing, even granted', hasPagePermission({ Notes: { view: true } }, 'Notes', 'view') === false, 'Notes is retired');
  ok('  nor does an inherited name', hasPagePermission({}, 'constructor', 'view') === false, 'own keys only');
  ok('no grant on a page: no view', hasPagePermission({ Guests: { view: true } }, 'Budget', 'view') === false, 'per page');

  console.log('\n  The server and the app make the same check:\n');
  const auth = read('api/_lib/collaboratorAuth.js');
  const ctx = read('src/lib/collaboratorContext.jsx');
  ok('collaboratorAuth.js delegates to collaboratorCan', /return collaboratorCan\(permissions, page, level\);/.test(auth), 'server');
  ok('  and so does collaboratorContext.jsx', /return collaboratorCan\(permissions, page, level\);/.test(ctx), 'app');
  const data = read('api/collaborator-data.js');
  ok('collaborator-data.js derives canEdit from the same check', /canEdit: hasPagePermission\(collaboration\.permissions, page, 'edit'\)/.test(data), 'so it is false');

  console.log('\n  The picker: one View only toggle per page, no edit control:\n');
  const modal = read('src/components/layout/CollaborateModal.jsx');
  ok('it lists every key in the map', /const pages = COLLABORATOR_PERMISSION_KEYS;/.test(modal), 'all eleven');
  ok('  by its nav label', /COLLABORATOR_PAGE_MAP\[page\]\.navLabel/.test(modal), 'navLabel');
  ok('  with exactly one checkbox per page, labeled View only',
     (modal.match(/<Checkbox\b/g) || []).length === 1 && />View only<\/label>/.test(modal), `${(modal.match(/<Checkbox\b/g) || []).length} checkbox(es)`);
  ok('  and no edit control or edit badge anywhere', !/handlePermissionChange\(page, 'edit'\)|PenSquare|>Edit<\/label>/.test(modal), 'none');
  ok('a saved grant carries view only, and editing reads a stale edit as view',
     /\[page, \{ view: collaboratorCan\(perms, page, 'view'\) \}\]/.test(modal) && /setPermissions\(viewOnly\(collaborator\.permissions\)\)/.test(modal), 'viewOnly');

  console.log('\n  The invite email:\n');
  const { html } = renderCollaboratorInviteEmail({
    collaboratorName: 'Ada Lovelace', coupleNames: 'Alex and Sam', acceptUrl: 'https://openinvite.com.au/collaborate/accept/x',
    permissions: { 'Event Details': { view: true }, Guests: { view: true, edit: true } },
  });
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  ok('a two-page grant names "Event details" and "Guest list"', text.includes('Event details') && text.includes('Guest list'), 'nav labels');
  ok('  followed by the ruled sentence once',
     (text.match(/You can view these pages\. You will not be able to change anything\./g) || []).length === 1, 'once');
  ok('  and says edit nowhere', !/edit/i.test(text), 'no "view & edit"');
  ok('  and never an internal key name', !/Event Details|\bGuests\b/.test(text), 'labels, not keys');

  console.log('\n  The accept page, Seating and Help:\n');
  const accept = read('src/pages/CollaboratorAccept.jsx');
  ok('the accept page lists nav labels and the ruled sentence',
     /collaboratorPageLabels\(invite\.permissions\)/.test(accept) && /COLLABORATOR_VIEW_ONLY_COPY/.test(accept) && !/view & edit|PenSquare/.test(accept), 'view only');
  const seating = read('src/pages/Seating.jsx');
  ok('Seating reads data.weddingDetails, the key collaborator-data.js returns',
     /getWeddingEvents\(data\.weddingDetails\)/.test(seating) && !/data\.WeddingDetails/.test(seating), 'weddingDetails');
  const help = fs.readFileSync(path.join(ROOT, 'src/pages/Help.jsx'), 'utf8');
  const at = help.indexOf("'Inviting a collaborator': (");
  const article = help.slice(at, help.indexOf('\n  ),\n', at));
  ok('the Help article promises no edit access',
     article.length > 500 && !/Full Access|view and edit|Changes made by collaborators|access level/i.test(article), `${article.length} chars`);
  ok('  and says they cannot change anything, with the 7-day link', /They cannot change anything\./.test(article) && /works for 7 days/.test(article), 'true copy');
  // The article is replaced in place: every other article survives.
  const titles = (h) => (h.match(/^  '[^']+': \(/mg) || []).length;
  ok('  and the other Help articles are all still there', titles(help) >= 20, `${titles(help)} articles`);

  return results;
}
