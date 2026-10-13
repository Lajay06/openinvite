/**
 * tests/persistence/collaborator-truthful-permissions.mjs
 *
 * EVERY COLLABORATOR PAGE IS VIEW ONLY, EXCEPT SCHEDULE WHEN THE OWNER ALLOWS
 * IT, AND EVERYTHING SAYS SO. (Schedule joined COLLABORATOR_EDIT_PAGES with
 * its write PR, owner ruling 2026-10-13.)
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

  console.log('\n  Every page is view only, except Schedule and Moodboard when edit is granted, on the server:\n');
  ok('the map offers all eleven pages', keys.length === 11, keys.join(', '));
  ok('  and Schedule and Moodboard are the only editable pages', JSON.stringify(map.COLLABORATOR_EDIT_PAGES) === '["Schedule","Moodboard"]', 'change and remove only');
  const all = Object.fromEntries(keys.map(k => [k, { view: true, edit: true }]));
  ok('a grant naming edit on every page: edit holds on Schedule and Moodboard and nowhere else',
     keys.every(k => hasPagePermission(all, k, 'edit') === (k === 'Schedule' || k === 'Moodboard')), 'a stale edit elsewhere does nothing');
  ok('  and Schedule with view only cannot be changed', hasPagePermission({ Schedule: { view: true } }, 'Schedule', 'edit') === false, 'edit must be granted');
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

  console.log('\n  The picker: View only on every page, and Can make changes on Schedule alone:\n');
  const modal = read('src/components/layout/CollaborateModal.jsx');
  ok('it lists every key in the map', /const pages = COLLABORATOR_PERMISSION_KEYS;/.test(modal), 'all eleven');
  ok('  by its nav label', /COLLABORATOR_PAGE_MAP\[page\]\.navLabel/.test(modal), 'navLabel');
  ok('  with one View only checkbox per page, and one Can make changes only for an editable page',
     (modal.match(/<Checkbox\b/g) || []).length === 2 && />View only<\/label>/.test(modal)
     && /\{COLLABORATOR_EDIT_PAGES\.includes\(page\) && \(\s*<div[^>]*>\s*<Checkbox\s+id=\{`\$\{page\}-edit`\}/.test(modal) && />Can make changes<\/label>/.test(modal), `${(modal.match(/<Checkbox\b/g) || []).length} checkbox(es)`);
  ok('  and no other edit control or edit icon', !/PenSquare|>Edit<\/label>/.test(modal), 'none');
  ok('a saved grant carries edit only for an editable page, and editing reads a stale edit elsewhere as view',
     /\.\.\.\(COLLABORATOR_EDIT_PAGES\.includes\(page\) \? \{ edit: collaboratorCan\(perms, page, 'edit'\) \} : \{\}\)/.test(modal) && /setPermissions\(viewOnly\(collaborator\.permissions\)\)/.test(modal), 'viewOnly');
  ok('  and View only and Can make changes are a choice, never both',
     /checked=\{!!permissions\[page\]\?\.view && !permissions\[page\]\?\.edit\}/.test(modal) && /if \(choice === 'edit'\) return \{ \.\.\.prev, \[page\]: \{ view: true, edit: !cur\.edit \} \};/.test(modal), 'exclusive');

  console.log('\n  The invite email:\n');
  const { html, preheader } = renderCollaboratorInviteEmail({
    collaboratorName: 'Ada Lovelace', coupleNames: 'Alex and Sam', acceptUrl: 'https://openinvite.com.au/collaborate/accept/x',
    permissions: { 'Event Details': { view: true }, Guests: { view: true, edit: true } },
  });
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  ok('a two-page grant names "Event details" and "Guest list"', text.includes('Event details') && text.includes('Guest list'), 'nav labels');
  ok('  followed by the ruled sentence once',
     (text.match(/You can view these pages\. You will not be able to change anything\./g) || []).length === 1, 'once');
  ok('  and says edit nowhere', !/edit/i.test(text), 'no "view & edit"');
  const sched = renderCollaboratorInviteEmail({
    collaboratorName: 'Ada', coupleNames: 'Alex and Sam', acceptUrl: 'https://x',
    permissions: { Guests: { view: true }, Schedule: { view: true, edit: true } },
  }).html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  ok('with Schedule changeable: "Schedule (you can make changes)", and the other sentence',
     sched.includes('Schedule (you can make changes)') && sched.includes('You can view these pages. You can make changes only where it says so.')
     && !sched.includes('You will not be able to change anything.') && !sched.includes('Guest list (you can make changes)'), 'marked');
  ok('  and never an internal key name', !/Event Details|\bGuests\b/.test(text), 'labels, not keys');
  ok('the preheader is the owner\'s line, in the inbox list only',
     preheader === 'Alex and Sam have shared their plans with you.' && html.includes('display:none') && html.includes(preheader), preheader);
  const anon = renderCollaboratorInviteEmail({ collaboratorName: '', coupleNames: '', acceptUrl: 'https://x', permissions: {} });
  ok('  and with no couple names, its own line', anon.preheader === 'Someone has shared their wedding plans with you.', anon.preheader);
  ok('the footer closes as the other Openinvite emails do', /Openinvite, Australia\. hello@openinvite\.com\.au/.test(text), 'Australia and the support address');

  console.log('\n  The accept page, Seating and Help:\n');
  const accept = read('src/pages/CollaboratorAccept.jsx');
  ok('the accept page lists nav labels and the grant\'s own closing sentence',
     /collaboratorPageLabels\(invite\.permissions\)/.test(accept) && /collaboratorClosingCopy\(invite\.permissions\)/.test(accept) && !/view & edit|PenSquare/.test(accept), 'as the email');
  const seating = read('src/pages/Seating.jsx');
  ok('Seating reads data.weddingDetails, the key collaborator-data.js returns',
     /getWeddingEvents\(data\.weddingDetails\)/.test(seating) && !/data\.WeddingDetails/.test(seating), 'weddingDetails');
  const help = fs.readFileSync(path.join(ROOT, 'src/pages/Help.jsx'), 'utf8');
  const at = help.indexOf("'Inviting a collaborator': (");
  const article = help.slice(at, help.indexOf('\n  ),\n', at));
  ok('the Help article promises no edit access',
     article.length > 500 && !/Full Access|view and edit|Changes made by collaborators|access level/i.test(article), `${article.length} chars`);
  ok('  and says they cannot change anything except Schedule if allowed, with the 7-day link',
     /They cannot change anything, except Schedule and Moodboard if you let them\./.test(article) && /check "Can make changes" instead/.test(article)
     && /anything else, and Ava is not available/.test(article) && /works for 7 days/.test(article), 'true copy');
  ok('  in US English: check, trash icon, right away', /check "View only"/.test(article) && /trash icon/.test(article) && /right away/.test(article)
     && !/\btick\b|\bbin\b|straight away/.test(article), 'owner edits');
  // The article is replaced in place: every other article survives.
  const titles = (h) => (h.match(/^  '[^']+': \(/mg) || []).length;
  ok('  and the other Help articles are all still there', titles(help) >= 20, `${titles(help)} articles`);

  return results;
}
