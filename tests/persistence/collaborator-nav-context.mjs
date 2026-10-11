/**
 * tests/persistence/collaborator-nav-context.mjs
 *
 * NAVIGATING IN A COLLABORATOR SESSION KEEPS THE SESSION.
 *
 * Item 2 of goals/2026-10-10-collaborators-safe-and-truthful.md. A
 * collaborator session lives in one query parameter, collabOwner. The sidebar
 * stripped it on every click (item.url.split("?")[0]) and its top-level items
 * navigated to routes that never had it, so one click landed the collaborator
 * on their OWN, unrelated dashboard. withCollab in src/lib/collaboratorContext.jsx
 * is now the one way an in-app URL keeps it.
 *
 * Two halves:
 *   1. withCollab itself, EXECUTED: its source is read out of the .jsx (it is
 *      plain JavaScript, no JSX) and run, so the cases below test the code
 *      that ships, not a copy of it.
 *   2. Every navigation site in the sidebar and on the permissioned pages goes
 *      through it. Exit collaboration is the one deliberate exception, and it
 *      does not use navigate.
 *
 * The plant: the sidebar's navigate wrapper calling navigateRaw(url) without
 * withCollab turns half 2 red. Proven by hand and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function loadWithCollab() {
  const src = read('src/lib/collaboratorContext.jsx');
  const start = src.indexOf('export function withCollab(');
  if (start === -1) return null;
  const end = src.indexOf('\n}\n', start);
  const body = src.slice(start, end + 2).replace('export function', 'function');
  return new Function(`${body}\nreturn withCollab;`)();
}

export async function runCollaboratorNavContext() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. withCollab, executed ───────────────────────────────────────────────
  console.log('\n  withCollab keeps the session on an in-app URL, and only there:\n');
  const withCollab = loadWithCollab();
  ok('withCollab exists in collaboratorContext.jsx', typeof withCollab === 'function', 'exported');
  if (typeof withCollab === 'function') {
    const cases = [
      ['adds the owner to a bare path', withCollab('/Guests', 'own-1'), '/Guests?collabOwner=own-1'],
      ['keeps the other params', withCollab('/Guests?setEvents=e1', 'own-1'), '/Guests?setEvents=e1&collabOwner=own-1'],
      ['keeps the hash, after the query', withCollab('/Budget#top', 'own-1'), '/Budget?collabOwner=own-1#top'],
      ['does not double-add', withCollab('/Guests?collabOwner=own-1', 'own-1'), '/Guests?collabOwner=own-1'],
      ['encodes an id that needs it', withCollab('/Guests', 'a b&c'), '/Guests?collabOwner=a+b%26c'],
      ['leaves an external URL alone', withCollab('https://example.com/x', 'own-1'), 'https://example.com/x'],
      ['leaves a protocol-relative URL alone', withCollab('//example.com/x', 'own-1'), '//example.com/x'],
      ['leaves mailto alone', withCollab('mailto:a@example.com', 'own-1'), 'mailto:a@example.com'],
      ['changes nothing outside a session', withCollab('/Guests?x=1', null), '/Guests?x=1'],
      ['passes a non-string through', withCollab(undefined, 'own-1'), undefined],
    ];
    for (const [label, got, want] of cases) ok(`  ${label}`, got === want, `${got}`);
  }

  // ── 2. every navigation site goes through it ──────────────────────────────
  console.log('\n  Every navigation in the sidebar and on the permissioned pages keeps it:\n');
  const sidebar = stripComments(read('src/components/layout/AnimatedSidebar.jsx'), { trailing: true });
  const wrappers = sidebar.match(/const navigate = \(url\) => navigateRaw\(withCollab\(url, collabOwnerId\)\);/g) || [];
  ok('the desktop and mobile sidebars each wrap navigate in withCollab', wrappers.length === 2, `${wrappers.length} wrapper(s)`);
  const rawCalls = (sidebar.match(/navigateRaw\(/g) || []).length;
  ok('  and navigateRaw is called nowhere else', rawCalls === wrappers.length, `${rawCalls} call(s)`);
  ok('  and nothing binds useNavigate() straight to navigate',
     !/const navigate = useNavigate\(\)/.test(sidebar), 'navigateRaw only');
  ok('  and the sidebar renders no Link that could skip it', !/<Link\b/.test(sidebar), 'no Link');
  // Hard navigations end the session on purpose: Exit collaboration, and Log
  // out, which ends every session. Nothing else may.
  const hrefs = sidebar.split('\n').filter(l => /window\.location\.href\s*=/.test(l));
  const deliberate = (l) => /isCollaborator \? createPageUrl\("DailyUpdate"\)/.test(l) || /window\.location\.href = '\/login';/.test(l);
  ok('  the only hard navigations are Exit collaboration and Log out',
     hrefs.length > 0 && hrefs.every(deliberate), hrefs.filter(l => !deliberate(l)).join(' | ') || `${hrefs.length} line(s)`);

  const pages = ['DailyUpdate', 'Dashboard', 'Guests', 'Budget', 'ScheduleHub', 'Music', 'Invitations', 'Seating', 'Registry', 'Vendors', 'Moodboard', 'EventDetails'];
  const misses = [];
  for (const page of pages) {
    const src = stripComments(read(`src/pages/${page}.jsx`), { trailing: true });
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (/\bnavigate\(/.test(line) && !/useNavigate\(/.test(line) && !/withCollab\(/.test(line)) misses.push(`${page}.jsx:${i + 1}`);
      // A Link's target may sit on a later line of the same tag: read up to
      // the tag's end, and require its to= to go through withCollab.
      if (/<Link\b/.test(line)) {
        let tag = '';
        for (let j = i; j < Math.min(lines.length, i + 12); j++) { tag += lines[j] + '\n'; if (/>/.test(lines[j].replace(/=>/g, ''))) break; }
        const to = tag.match(/\bto=\{([^\n]*)\}/);
        if (!to || !/withCollab\(/.test(to[1])) misses.push(`${page}.jsx:${i + 1}`);
      }
    });
  }
  ok('every navigate( and Link on the permissioned pages and Dashboard passes through withCollab',
     misses.length === 0, misses.length ? misses.join(', ') : `${pages.length} pages`);
  const dash = stripComments(read('src/pages/Dashboard.jsx'), { trailing: true });
  ok('Dashboard no longer builds its own collabOwner suffix', !/collabSuffix|\?collabOwner=/.test(dash), 'withCollab only');

  // ── Help and Account are the person's own (owner ruling 2026-10-11) ─────
  const layout = stripComments(read('src/Layout.jsx'), { trailing: true });
  ok('in a collaborator session, Layout opens Help and Account without a grant',
     /const SELF_PAGES = new Set\(\['Help', 'Account'\]\);/.test(layout)
     && /const canViewCurrentPage = !isCollaborating \|\| SELF_PAGES\.has\(currentPageName\) \|\|/.test(layout),
     'SELF_PAGES');
  ok('  and the set is exactly those two', (layout.match(/new Set\(\[[^\]]*\]\)/g) || []).some(m => m === "new Set(['Help', 'Account'])"), "['Help', 'Account']");
  ok('  while the sidebar still sends them with the session kept', /navigate\("\/help"\)/.test(sidebar) && /navigate\("\/account"\)/.test(sidebar), 'through the wrapper');

  return results;
}
