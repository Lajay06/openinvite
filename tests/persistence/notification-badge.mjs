/**
 * tests/persistence/notification-badge.mjs
 *
 * THE BELL SAID "SOMETHING HAPPENED" AND NOTHING MORE.
 *
 * A 5px dot in the corner (NotificationBell.jsx, before this change) is a
 * boolean: there is at least one unread thing. Whether that was one RSVP or
 * eleven could only be learned by opening the panel, which is the action the
 * badge exists to help you decide about.
 *
 * The count is now on the badge, capped at "9+", and it clears when the panel
 * opens. Clearing is NOT a write: marking every row read on open would put a
 * database write behind a click that is often just a glance, and would erase
 * the unread tint the couple uses to find the row they have not dealt with yet.
 * "Seen" and "dealt with" are different facts and the panel only establishes
 * the first.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { badgeLabel, unseenCount } from '../../src/lib/notificationBadge.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function runNotificationBadge() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The notifications bell shows a number, and the panel clears it:\n');

  // ── THE LABEL ───────────────────────────────────────────────────────────
  check('no badge at all when nothing is unread', badgeLabel(0) === '' && badgeLabel(undefined) === '', 'empty string');
  check('  one unread reads "1"', badgeLabel(1) === '1', badgeLabel(1));
  check('  nine unread reads "9" — the last uncapped value', badgeLabel(9) === '9', badgeLabel(9));
  check('  ten unread reads "9+", not "10"', badgeLabel(10) === '9+', badgeLabel(10));
  check('  and so does a hundred', badgeLabel(100) === '9+', badgeLabel(100));

  // ── THE COUNT, AND WHAT OPENING THE PANEL DOES TO IT ─────────────────────
  const feed = [
    { id: 'a', read: false }, { id: 'b', read: false }, { id: 'c', read: true },
  ];
  check('the badge counts unread notifications, not all of them',
    unseenCount(feed, new Set()) === 2, `${unseenCount(feed, new Set())} of ${feed.length}`);

  // Opening the panel: every currently-unread id becomes seen.
  const seen = new Set(feed.filter(n => !n.read).map(n => n.id));
  check('  opening the panel clears the badge',
    unseenCount(feed, seen) === 0, `${unseenCount(feed, seen)}`);
  check('  and the rows are still unread — seen is not the same as dealt with',
    feed.filter(n => !n.read).length === 2, `${feed.filter(n => !n.read).length} rows still unread`);

  // A notification that arrives after the panel closed brings the badge back,
  // for that one alone.
  const later = [...feed, { id: 'd', read: false }];
  check('  a new arrival brings the badge back, counting only itself',
    unseenCount(later, seen) === 1, `${unseenCount(later, seen)}`);
  check('  and it reads "1"', badgeLabel(unseenCount(later, seen)) === '1', badgeLabel(unseenCount(later, seen)));

  // ── PLANTED FAILURES (R19) ──────────────────────────────────────────────
  // Two ways this is commonly got wrong, each fed to the same assertions.
  {
    // PLANT 1: a cap that formats rather than caps — "10" instead of "9+".
    const uncapped = (n) => (n > 0 ? String(n) : '');
    check('PLANT: an uncapped label produces "10" and fails the cap check',
      uncapped(10) === '10' && badgeLabel(10) !== uncapped(10), `uncapped=${uncapped(10)} capped=${badgeLabel(10)}`);

    // PLANT 2: clearing by marking rows read, which is the tempting shortcut.
    // The badge clears either way — so the check that separates them is the
    // one about the rows, and it must reject this.
    const marked = feed.map(n => ({ ...n, read: true }));
    check('PLANT: clearing by marking every row read loses the unread rows',
      unseenCount(marked, new Set()) === 0 && marked.filter(n => !n.read).length === 0,
      'badge clears, but 0 rows remain unread — the check above requires 2');
  }

  // ── IT IS ACTUALLY WIRED THAT WAY ───────────────────────────────────────
  {
    const src = readFileSync(join(ROOT, 'src/components/layout/NotificationBell.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('the bell renders the label, not a bare dot',
      /badgeLabel\(unreadCount\)/.test(src), 'badgeLabel(unreadCount)');
    check('  the badge is reachable from a test',
      /data-testid="notification-badge"/.test(src), 'data-testid="notification-badge"');
    check('  opening the panel records what was unread',
      /openPanel/.test(src) && /s\.add\(n\.id\)/.test(src), 'openPanel snapshots the unread ids');
    check('  and opening it writes nothing',
      !/markAllRead\.mutate/.test(src.split('const openPanel')[1]?.split('};')[0] || ''),
      'no mutate inside openPanel');
    check('  the aria-label still carries the count for a screen reader',
      /aria-label=\{unreadCount > 0 \? `Notifications \(\$\{unreadCount\} unread\)`/.test(src), 'aria-label unchanged');
  }

  return results;
}
