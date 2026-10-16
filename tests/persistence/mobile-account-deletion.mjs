/**
 * tests/persistence/mobile-account-deletion.mjs
 *
 * ACCOUNT DELETION STARTS IN THE APP. App Store rule 5.1.1(v), ruling 2 of
 * goals/2026-10-15-app-store-launch.md, which authorizes this one change to
 * the auth surface: Account has "Delete account", a confirm step that names
 * what is deleted, and it runs the same deletion the website runs. The app
 * never sends the couple to the website to delete.
 *
 * The website's deletion (src/pages/Account.jsx, handleDeleteRequest) is a
 * verified request: SendEmail to the team, then updateMe with
 * deletionRequestedAt. This guard reads the website's handler for its
 * recipient, subject and stamp, and holds the app's module to the same ones,
 * so if the website's deletion changes the app is told.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

export async function runMobileAccountDeletion() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // The website's deletion, as it stands.
  const web = code('src/pages/Account.jsx');
  const handler = (web.match(/const handleDeleteRequest = async \(\) => \{([\s\S]*?)\n {2}\};/) || [])[1] || '';
  const webTo = (handler.match(/to: '([^']+)'/) || [])[1];
  const webSubject = (handler.match(/subject: '([^']+)'/) || [])[1];
  ok('the website deletion is still a SendEmail then a deletionRequestedAt stamp',
     /SendEmail\(/.test(handler) && /updateMe\(\{ deletionRequestedAt:/.test(handler) && handler.indexOf('SendEmail(') < handler.indexOf('updateMe('),
     handler ? 'src/pages/Account.jsx handleDeleteRequest' : 'handler not found');

  // The app's module: the same recipient, subject and stamp.
  let mod = {};
  try { mod = await import(path.join(ROOT, 'src/mobile/lib/accountDeletion.js')); } catch (e) { mod = {}; }
  ok('the app sends to the same inbox with the same subject',
     !!webTo && mod.DELETION_INBOX === webTo && mod.DELETION_SUBJECT === webSubject, `${mod.DELETION_INBOX} / ${mod.DELETION_SUBJECT}`);
  const email = mod.deletionRequestEmail?.({ email: 'a@b.co', full_name: 'Ana', id: 'u1' }) || {};
  ok('  and the email carries the email, the name and the user id',
     email.to === webTo && /Email: a@b\.co/.test(email.body) && /Name: Ana/.test(email.body) && /User ID: u1/.test(email.body), 'deletionRequestEmail');
  const stamp = mod.deletionStamp?.(new Date('2026-10-15T00:00:00Z')) || {};
  ok('  and the stamp is deletionRequestedAt as an ISO time, and nothing else',
     JSON.stringify(stamp) === JSON.stringify({ deletionRequestedAt: '2026-10-15T00:00:00.000Z' }), JSON.stringify(stamp));
  ok('  and it names what is deleted', Array.isArray(mod.WHAT_IS_DELETED) && mod.WHAT_IS_DELETED.length >= 5, `${mod.WHAT_IS_DELETED?.length} lines`);

  // The real api runs it in the website's order.
  const real = code('src/mobile/data/realApi.js');
  const run = (real.match(/requestAccountDeletion: async \(user\) => \{([\s\S]*?)\n {4}\},/) || [])[1] || '';
  ok('the real api sends the email, then writes the stamp',
     /await SendEmail\(deletionRequestEmail\(user\)\)/.test(run) && /base44\.auth\.updateMe\(deletionStamp\(\)\)/.test(run) && run.indexOf('SendEmail') < run.indexOf('updateMe'), 'realApi.js');
  ok('  and the demo never emails anyone', !/SendEmail/.test(code('src/mobile/fixtures/previewApi.js')), 'previewApi.js');

  // The flow on screen.
  const screen = code('src/mobile/screens/account/AccountScreen.jsx');
  ok('Account offers Delete account, and shows the request once made',
     /label="Delete account"[^>]*onClick=\{onDeleteAccount\}/.test(screen) && /data-delete-account=\{deletionRequested \? 'requested' : 'offered'\}/.test(screen), 'AccountScreen.jsx');
  const sheets = code('src/mobile/screens/account/AccountSheets.jsx');
  const sheet = (sheets.match(/export function DeleteAccountSheet[\s\S]*$/) || [''])[0];
  ok('the confirm step names what is deleted and waits for DELETE',
     /WHAT_IS_DELETED\.map/.test(sheet) && /typed\.trim\(\) === 'DELETE'/.test(sheet) && /disabled=\{!ready\}/.test(sheet), 'DeleteAccountSheet');
  ok('  and never sends the couple to the website to delete',
     !/openWebPage|openExternal|openDesktop|desktopHandoff|PROD_ORIGIN|href/.test(sheet) && !/delete your account at/i.test(sheets), 'AccountSheets.jsx');
  const container = code('src/mobile/screens/account/AccountContainer.jsx');
  ok('the container runs the api request and reads the stamp back',
     /await api\.requestAccountDeletion\(user\)/.test(container) && /user\?\.deletionRequestedAt/.test(container) && /<DeleteAccountSheet [^\n]*onConfirm={requestDeletion} \/>/.test(container), 'AccountContainer.jsx');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileAccountDeletion();
  process.exit(r.every(Boolean) ? 0 : 1);
}
