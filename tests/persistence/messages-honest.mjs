/**
 * Messages tells the truth, and the count it was already computing is visible.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Goal 2026-09-27 item 4: 'Empty state becomes: heading "No notes yet"; body
 * "When a guest sends you a note from your site, it lands here. Replies go to
 * their email." Filtered empty state stays. Remove the channel filter and any
 * WhatsApp/email channel labels on rows — every note arrives in_app. Keep
 * WhatsAppCompose as what it is, an open-in-WhatsApp link, labelled "Open in
 * WhatsApp". Wire unreadMessagesCount (src/Layout.jsx:456) to a badge on the
 * sidebar Messages item, or delete it. Wire it. Reply stays email via
 * api/send-guest-reply.js, untouched.'
 *
 * ── WHAT WAS ACTUALLY WRONG ────────────────────────────────────────────────
 *
 * Two things, and both were invisible because they read as ordinary emptiness.
 *
 * THE EMPTY STATE DESCRIBED A ROUTE THAT DID NOT EXIST: "once guests start
 * reaching out through the guest portal". There was no guest portal. Nothing in
 * this repository had ever created a GuestMessage, so the page was permanently
 * empty and its own copy explained that away. A couple reading it concluded
 * their guests were quiet.
 *
 * THE COUNT WAS COMPUTED AND RENDERED NOWHERE. Layout.jsx built
 * unreadMessagesCount, put it in the query result, and no component ever
 * received it — so a couple with four unread notes saw the same sidebar as a
 * couple with none. It was also computed from a query that could never return a
 * row (created_by_id on an admin-key-written entity), so it was zero twice over.
 *
 * ── AND ONE THING THAT WAS NOT WRONG ───────────────────────────────────────
 *
 * The channel filter and the channel labels. The ruling says to remove them;
 * they were not there. The filter pills are all / unread / unreplied / replied,
 * and no row renders a channel. The checks below assert their ABSENCE, so the
 * ruling holds going forward, rather than reporting work that was not done.
 * WhatsAppCompose was likewise already labelled "Open in WhatsApp", in its
 * sheet title, its header and its button — pinned here so it stays that way.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MESSAGES = strip(read('src/pages/Messages.jsx'));
const LAYOUT = strip(read('src/Layout.jsx'));
const SIDEBAR = strip(read('src/components/layout/AnimatedSidebar.jsx'));
const COMPOSE = read('src/components/messages/WhatsAppCompose.jsx');
const SEND_REPLY = strip(read('api/send-guest-reply.js'));

export async function runMessagesHonest() {
  const r = [];
  const check = (n, ok, d) => r.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Messages, honest — and the count that was already there:\n');

  // ── the empty state, verbatim ────────────────────────────────────────────
  check('the empty state heading is the owner\'s',
    MESSAGES.includes("'No notes yet'"), 'No notes yet');
  check('  and its body says where a reply goes',
    MESSAGES.includes('When a guest sends you a note from your site, it lands here. Replies go to their email.'),
    'verbatim');
  // THE OLD SENTENCE IS GONE, asserted as an absence — it is the one that was
  // untrue, and a partial edit could leave it beside the new one.
  check('  and the guest-portal sentence is gone',
    !/guest portal/.test(MESSAGES), 'no route that does not exist');
  check('the filtered empty state is untouched, per the ruling',
    MESSAGES.includes("'No messages found'") && MESSAGES.includes("'Try adjusting your search or filter.'"),
    'a search that matches nothing is a different fact');

  // ── no channel filter, no channel labels ─────────────────────────────────
  //
  // ASSERTED AS ABSENCE. There was nothing to remove; these keep it that way.
  check('the filter pills are status only — no channel among them',
    /const FILTERS = \[\s*\{ key: 'all'/.test(MESSAGES)
      && !/key: 'whatsapp'/.test(MESSAGES) && !/key: 'email'/.test(MESSAGES)
      && !/key: 'in_app'/.test(MESSAGES),
    'all / unread / unreplied / replied');
  check('  and no row renders a channel label',
    !/message\.channel/.test(MESSAGES), 'every note arrives in_app');

  // ── WhatsAppCompose is what it is ────────────────────────────────────────
  check('WhatsAppCompose is labelled "Open in WhatsApp"',
    (COMPOSE.match(/Open in WhatsApp/g) || []).length >= 3, 'sheet title, header, button');
  check('  and the row control says the same',
    MESSAGES.includes('title="Open in WhatsApp"'), 'no ambiguity about what it does');
  check('  it opens a link rather than claiming to send',
    /Opens in WhatsApp/.test(COMPOSE), 'honest about the account it sends from');

  // ── the count is real, and it reaches the sidebar ─────────────────────────
  check('Layout reads the notes from the endpoint, not by created_by_id',
    /fetchGuestNotes\(\)/.test(LAYOUT) && !/getMyRecords\('GuestMessage'\)/.test(LAYOUT),
    '/api/guest-notes');
  check('  the count is still the unread ones',
    /unreadMessagesCount: messages\.filter\(m => !m\.read\)\.length/.test(LAYOUT), 'unchanged rule');
  check('  it is read off the query result',
    /const unreadMessagesCount = layoutData\?\.unreadMessagesCount \?\? 0/.test(LAYOUT), 'no longer dead');
  check('  and handed to the desktop sidebar',
    /<AnimatedSidebar[\s\S]{0,400}unreadMessagesCount=\{unreadMessagesCount\}/.test(LAYOUT), 'prop passed');
  check('  and to the mobile one, because the same couple uses both',
    /<MobileSidebarContent[\s\S]{0,400}unreadMessagesCount=\{unreadMessagesCount\}/.test(LAYOUT), 'prop passed');

  check('both sidebars accept the count',
    /export function AnimatedSidebar\(\{[^}]*unreadMessagesCount = 0/.test(SIDEBAR)
      && /export function MobileSidebarContent\(\{[^}]*unreadMessagesCount = 0/.test(SIDEBAR),
    'with a zero default');
  // THE SOURCE IS DECLARED ON THE ITEM, not matched on its label — renaming
  // "Messages" must not silently unwire the badge.
  check('the Messages nav item declares that it carries the count',
    /label: "Messages",\s+url: createPageUrl\("Messages"\), countKey: 'unreadMessages'/.test(SIDEBAR),
    'countKey, not a label match');
  check('  the desktop row passes it through',
    /count=\{item\.countKey === 'unreadMessages' \? unreadMessagesCount : 0\}/.test(SIDEBAR), 'NavItem count');
  check('  and NavItem paints it', /\{count > 99 \? '99\+' : count\}/.test(SIDEBAR), 'with a cap at 99+');
  check('  the mobile row paints it too',
    /\{unreadMessagesCount > 99 \? '99\+' : unreadMessagesCount\}/.test(SIDEBAR), 'same badge');
  // A ZERO BADGE IS A PERMANENT MARK ON A ROW WITH NOTHING BEHIND IT.
  check('nothing is painted when there is nothing to count',
    /\{count > 0 && \(/.test(SIDEBAR) && /unreadMessagesCount > 0 && \(/.test(SIDEBAR), 'count > 0');
  // BOTH BADGES, AND NOTHING ELSE IN THIS FILE. 999px is the pill exception the
  // spec allows; these two are the only 999 radii in the sidebar, so the count
  // also catches a third one appearing somewhere it should not.
  check('  the badge is a pill, the one rounding the spec allows',
    (SIDEBAR.match(/borderRadius: 999/g) || []).length === 2, 'both sidebars, and only those');
  check('  and it carries a label a screen reader can read',
    (SIDEBAR.match(/aria-label=\{`\$\{count\} unread`\}/g) || []).length === 1
      && (SIDEBAR.match(/aria-label=\{`\$\{unreadMessagesCount\} unread`\}/g) || []).length === 1,
    'not a bare number');

  // ── and the badge updates without a reload ───────────────────────────────
  check('Messages.jsx still invalidates the layout query, so the badge follows',
    /invalidateQueries\(\{ queryKey: \[LAYOUT_QUERY_KEY\] \}\)/.test(MESSAGES),
    'which now does something');

  // ── the reply path is untouched ──────────────────────────────────────────
  check('the reply is still emailed by api/send-guest-reply.js',
    MESSAGES.includes("fetch('/api/send-guest-reply'"), 'unchanged caller');
  check('  and that endpoint still writes nothing to Base44',
    !/entities\//.test(SEND_REPLY), 'it only sends the email');

  return r;
}
