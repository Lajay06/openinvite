/**
 * tests/persistence/content-tab-page-scoped.mjs
 *
 * THE EDITOR NOW MOVES WITH THE PAGE.
 *
 * The left panel selects a page and the preview follows it; the right panel's
 * Content tab did not. It showed the same global form on all twelve pages, so
 * a couple standing on Our story scrolled a tab full of Home fields to reach
 * the story box, and a couple on Registry found no registry fields at all and
 * no statement of where they were.
 *
 * WHY MOST PAGES GET A SENTENCE RATHER THAN A FORM. Nine of the twelve are
 * written on a planner page that already owns their data. Rebuilding those
 * forms here would be a SECOND WRITE PATH onto the same fields — which is
 * exactly what the Ceremony & reception block already refuses to do, in as many
 * words, at its own site. So the tab names the page and links to it, once,
 * plainly.
 *
 * SOURCE-READ, and honestly so: the sections are JSX inside a .jsx component
 * that plain Node cannot import, and the thing under test is which section
 * renders for which page — a structural fact about the file.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEDDING_PAGES } from '../../src/lib/websiteThemes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/**
 * THE SECTIONS a page renders — plural, and that plural is the point.
 *
 * The component does not pick one section. It renders every block whose page
 * list contains the current page, as three independent `&&` guards. An earlier
 * version of this helper returned a single section and consulted the three
 * lists in order, which quietly made one of the owner's plants unfirable:
 * adding 'home' to CONTENT_STORY put the story editor back on the Home page
 * and this file reported green, because it stopped looking after CONTENT_HOME
 * matched. A model that cannot represent the defect cannot guard against it.
 *
 * Reads the three page lists and the pointer table out of source, so the test
 * cannot drift from them.
 */
function sectionsFor(src, page) {
  const list = (name) => {
    const m = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(src);
    return m ? m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
  };
  const pointerBlock = /const EDITED_ELSEWHERE = \{([\s\S]*?)\n\};/.exec(src)?.[1] || '';
  const pointers = Object.fromEntries([...pointerBlock.matchAll(/^\s*'?([a-z-]+)'?:\s*\['([^']+)',\s*'([^']+)'\]/gm)]
    .map(m => [m[1], { label: m[2], href: m[3] }]));
  // The pointer is an early return: it renders instead of the sections, never
  // alongside them.
  if (pointers[page]) return { kinds: ['pointer'], ...pointers[page] };
  const kinds = [];
  if (list('CONTENT_HOME').includes(page)) kinds.push('home');
  if (list('CONTENT_STORY').includes(page)) kinds.push('story');
  if (list('CONTENT_CELEBRATION').includes(page)) kinds.push('celebration');
  return { kinds: kinds.length ? kinds : ['no-fields'] };
}

const shows = (src, page, kind) => sectionsFor(src, page).kinds.includes(kind);

export async function runContentTabPageScoped() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The Content tab shows the page you are on:\n');

  const src = code('src/components/website-builder/WBRightPanel.jsx');

  // ── THE THREE PLANTS THE OWNER NAMED ────────────────────────────────────
  check('PLANT: the Story page shows the story editor',
    shows(src, 'our-story', 'story'), sectionsFor(src, 'our-story').kinds.join(' + '));
  check('PLANT: the Home page does NOT show the story editor',
    !shows(src, 'home', 'story') && shows(src, 'home', 'home'), sectionsFor(src, 'home').kinds.join(' + '));
  check('  nor does any other page',
    WEDDING_PAGES.map(p => p.slug).filter(s2 => s2 !== 'our-story' && shows(src, s2, 'story')).length === 0,
    'the story editor is on the story page and nowhere else');
  check('PLANT: the Registry page shows the pointer sentence, not a form',
    shows(src, 'registry', 'pointer')
      && /Registry items are managed on the Registry planner page\./.test(sectionsFor(src, 'registry').label || ''),
    sectionsFor(src, 'registry').label || sectionsFor(src, 'registry').kinds.join(' + '));
  check('  and its link goes to that page',
    sectionsFor(src, 'registry').href === '/GuestSuiteRegistry', sectionsFor(src, 'registry').href);

  // ── THE STORY FIELDS ARE IN THE STORY SECTION AND NOWHERE ELSE ──────────
  {
    const storyBlock = /CONTENT_STORY\.includes\(currentPage\) && \(<>([\s\S]*?)<\/>\)\}/.exec(src)?.[1] || '';
    const homeBlock  = /CONTENT_HOME\.includes\(currentPage\) && \(<>([\s\S]*?)<\/>\)\}/.exec(src)?.[1] || '';
    check('the story text, photos and milestones are inside the story section',
      /ourStoryContent', 'storyText'/.test(storyBlock) && /<PhotoGrid/.test(storyBlock) && /<MilestoneEditor/.test(storyBlock),
      'all three');
    check('  and none of them is in the home section',
      !/ourStoryContent/.test(homeBlock) && !/<MilestoneEditor/.test(homeBlock), 'home is home');
    check('  the home section still has the tagline and the couple names',
      /homeContent', 'tagline'/.test(homeBlock) && /couple1Name/.test(homeBlock), 'unchanged');
  }

  // ── EVERY PAGE ANSWERS FOR ITSELF ───────────────────────────────────────
  {
    const unanswered = WEDDING_PAGES.map(p => p.slug).filter(slug => shows(src, slug, 'no-fields'));
    check(`all ${WEDDING_PAGES.length} built-in pages either edit something or say where it is edited`,
      unanswered.length === 0, unanswered.join(', ') || 'every page answers');
    const pointers = WEDDING_PAGES.map(p => p.slug).filter(slug => shows(src, slug, 'pointer'));
    check(`  ${pointers.length} of them point at a planner page rather than duplicating its form`,
      pointers.length === 9, pointers.join(', '));
    const editors = WEDDING_PAGES.map(p => p.slug).filter(slug => ['home', 'story', 'celebration'].some(k => shows(src, slug, k)));
    check('  and 3 edit content here', editors.length === 3, editors.join(', '));
  }

  // ── A CUSTOM PAGE DOES NOT CRASH AND DOES NOT LIE ───────────────────────
  check('a custom page falls through to a true sentence, not to the Home form',
    shows(src, 'our-pets', 'no-fields')
      && /This page has no content fields yet/.test(src),
    'no content fields yet');

  // ── THE POINTER IS A SENTENCE AND A LINK, NOT A CARD ────────────────────
  {
    const block = /function EditedElsewhere\(\{ label, href \}\) \{([\s\S]*?)\n\}/.exec(src)?.[1] || '';
    check('the pointer is one sentence and one link',
      /<a href=\{href\}/.test(block) && !/border:/.test(block) && !/background:/.test(block),
      'no card, no box, no illustration');
  }

  // ── THE TAB SURVIVES A PAGE CHANGE, AND KNOWS WHICH PAGE ────────────────
  {
    const studio = code('src/pages/StudioWebsite.jsx');
    // Not a bare grep of the file: currentPage is passed to four components
    // here, and only one of them is the right panel. Removing it from the
    // right panel alone reinstates the whole defect — ContentTab falls back
    // to its 'home' default and shows the Home form on all twelve pages —
    // while a file-wide grep stays green.
    const call = /<WBRightPanel([\s\S]*?)\/>/.exec(studio)?.[1] || '';
    check('the right panel is told which page it is on',
      /currentPage=\{currentPage\}/.test(call), call ? 'passed to WBRightPanel' : 'no WBRightPanel call found');
    // Two call sites change the page: the page list and the preview's own
    // navigation. Either one forcing the Design tab throws you off a Content
    // tab that has just become worth reading, so neither may.
    const forced = [...studio.matchAll(/onPageChange=\{[^}]*setRightPanelTab\('design'\)/g)].length;
    check('changing page no longer forces the Design tab',
      forced === 0, `${forced} page-change handler(s) still force it`);
  }

  // ── PLANT: the global tab, restored ─────────────────────────────────────
  check('PLANT: with no currentPage the tab would show Home fields on every page',
    /function ContentTab\(\{ details, onChange, currentPage = 'home' \}\)/.test(src),
    "the default is 'home', so a caller that forgets the prop shows Home — not the story editor on Registry");

  return results;
}
