/**
 * tests/persistence/custom-page-reachable.mjs
 *
 * A COUPLE'S OWN NEW PAGE TOLD THEIR GUESTS THE INVITATION WAS NOT AVAILABLE.
 *
 * Owner report: "New page" creates a page that connects to nothing, gets a
 * random identity, and does not appear in navigation.
 *
 * THE IDENTITY WAS NOT RANDOM, and saying so matters because it points at the
 * real fault. NewPageModal derives the slug from the title (`toSlug`,
 * NewPageModal.jsx:14) and passes `{ id: slug, name, slug, template,
 * sections: [] }` (:36) — the id IS the slug. WBLeftPanel appends to BOTH
 * `customPages` and `enabledPages` (:93-97). Creation was always correct.
 *
 * THE READING SIDE DROPPED IT, twice, for one reason: WEDDING_PAGES was
 * treated as the complete set of page slugs.
 *
 *   nav          looked the label up in WEDDING_PAGES and filtered out
 *                anything without one — a filter added for RETIRED slugs,
 *                which cannot tell a retired page from a new one.
 *   availability withAlwaysOnPages FILTERS to the list it is given
 *                (guestPages.js:26) and was given WEDDING_PAGES, so the custom
 *                slug was dropped from enabledPages and pageIsAvailable was
 *                false — serving <InvitationNotAvailable />, the same screen a
 *                guest gets for a site that was never published.
 *
 * "Connects to nothing" is exact.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPageSlugs, pageLabel, customPageFor, customPagesOf } from '../../src/lib/customPages.js';
import { withAlwaysOnPages } from '../../src/lib/guestPages.js';
import { WEDDING_PAGES } from '../../src/lib/websiteThemes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** What WBLeftPanel.handleCreatePage produces for "Our Pets". */
const WD = {
  slug: 'theo-and-larissa',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'our-pets'],
  customPages: [{ id: 'our-pets', slug: 'our-pets', name: 'Our Pets', template: 'blank', sections: [] }],
};

export async function runCustomPageReachable() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A new page is in the nav and answers on its own address:\n');

  // ── THE IDENTITY IS THE SLUG, NOT A RANDOM ID ───────────────────────────
  {
    const modal = code('src/components/website-builder/NewPageModal.jsx');
    check('the slug is derived from the title', /if \(!slugEdited\) setSlug\(toSlug\(v\)\)/.test(modal), 'toSlug(name)');
    check('  and the id IS the slug — nothing random is generated',
      /onCreate\(\{ id: slug, name: name\.trim\(\), slug,/.test(modal) && !/Math\.random|crypto\.randomUUID|Date\.now\(\)/.test(modal),
      'id: slug');
    const panel = code('src/components/website-builder/WBLeftPanel.jsx');
    check('creation adds the page to BOTH customPages and enabledPages, in order',
      /onChange\('customPages', \[\.\.\.customPages, page\]\)/.test(panel)
        && /onChange\('enabledPages', \[\.\.\.enabledPages, page\.slug\]\)/.test(panel),
      'appended, so it lands behind the built-ins — which is the #657 rule for a new page');
  }

  // ── THE NAV ─────────────────────────────────────────────────────────────
  check('a custom page has a label the nav can render', pageLabel(WD, 'our-pets') === 'Our Pets', pageLabel(WD, 'our-pets'));
  check('  built-in labels are unchanged', pageLabel(WD, 'rsvp') === 'RSVP', pageLabel(WD, 'rsvp'));
  check('  a retired slug STILL has no label, so the filter keeps working',
    pageLabel(WD, 'guestbook') === null, `${pageLabel(WD, 'guestbook')}`);
  check('the nav asks pageLabel rather than WEDDING_PAGES alone',
    /label: pageLabel\(weddingDetails, pageSlug\)/.test(code('src/components/guest-website/WeddingWebsiteNav.jsx')),
    'pageLabel(weddingDetails, pageSlug)');

  // ── THE ROUTE ───────────────────────────────────────────────────────────
  {
    const resolved = withAlwaysOnPages(WD.enabledPages, allPageSlugs(WD));
    check('the custom slug survives withAlwaysOnPages', resolved.includes('our-pets'), resolved.join(', '));
    check('  the always-on pages are still guaranteed',
      ['home', 'rsvp', 'celebration'].every(s => resolved.includes(s)), 'home, rsvp, celebration present');
    check('  and a page the couple turned OFF is still off',
      !resolved.includes('registry'), 'registry absent, as enabledPages says');
    check('the site passes every slug, not just the built-in twelve',
      /allPageSlugs\(weddingDetails\)/.test(code('src/components/guest-website/MultiPageWeddingWebsite.jsx')),
      'allPageSlugs(weddingDetails)');
    check('  and resolves a custom slug to the custom renderer, not the home page',
      /customPageFor\(weddingDetails, page\) \? WeddingCustomPage : WeddingHomePage/.test(code('src/components/guest-website/MultiPageWeddingWebsite.jsx')),
      'WeddingCustomPage');
    check('  the builder preview resolves it the same way',
      /customPageFor\(details, currentPage\) \? WeddingCustomPage : WeddingHomePage/.test(code('src/components/website-builder/RealWebsitePreview.jsx')),
      'the preview and the published site agree');
  }

  // ── THE RESOLVER ITSELF ─────────────────────────────────────────────────
  check(`allPageSlugs is the twelve built-ins plus the couple's own`,
    allPageSlugs(WD).length === WEDDING_PAGES.length + 1 && allPageSlugs({}).length === WEDDING_PAGES.length,
    `${allPageSlugs(WD).length} with one custom, ${allPageSlugs({}).length} without`);
  check('  a built-in slug is never mistaken for a custom page',
    customPageFor(WD, 'rsvp') === null && customPageFor(WD, 'our-pets')?.name === 'Our Pets', 'rsvp null, our-pets found');
  check('  malformed customPages do not throw',
    customPagesOf({ customPages: 'nope' }).length === 0
      && customPagesOf({ customPages: [null, {}, { slug: 'ok' }] }).length === 1,
    'non-array and slugless entries dropped');

  // ── PLANTS (R19) ────────────────────────────────────────────────────────
  {
    // PLANT 1: the availability check goes back to the built-in list.
    const dropped = withAlwaysOnPages(WD.enabledPages, WEDDING_PAGES.map(p => p.slug));
    check('PLANT: with WEDDING_PAGES alone the custom slug is dropped and the page 404s',
      !dropped.includes('our-pets'),
      'pageIsAvailable would be false, serving <InvitationNotAvailable />');

    // PLANT 2: the nav label falls back to the built-in lookup.
    const oldLabel = (slug) => WEDDING_PAGES.find(p => p.slug === slug)?.label;
    check('PLANT: with the old label lookup the page has no label and is filtered out of the nav',
      oldLabel('our-pets') === undefined && pageLabel(WD, 'our-pets') === 'Our Pets',
      'undefined then, "Our Pets" now');
  }

  return results;
}
