/**
 * tests/persistence/guest-suite-editor.mjs
 *
 * THE GUEST SUITE EDITOR, after the owner's 2026-09-07 pass.
 *
 * ── CUSTOM PAGES ────────────────────────────────────────────────────────────
 * #685 made a custom page reachable — nav, preview and the published site all
 * read `allPageSlugs()` rather than treating WEDDING_PAGES as the whole world.
 * What was left is the editor's own list: a custom page had a delete and
 * nothing else, so the only way to take one off the site was to destroy it,
 * while eleven built-ins beside it all toggled.
 *
 * ── CONTROLS THAT DO NOTHING ────────────────────────────────────────────────
 * Owner: "if the active universe dictates them, don't let users see that."
 * Page transition was exactly that. MultiPageWeddingWebsite.jsx:509 reads
 * `universeConfig?.pageTransition ?? weddingDetails.pageTransition`, and all
 * twenty universes declare one, so the couple's choice was never read once.
 * Scroll animation is the opposite case and stays — but `isMotionEnabled`
 * tests `!== 'none'`, so "Subtle" and "Dramatic" were the same site.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNIVERSE_CONFIGS } from '../../src/lib/websiteThemes.js';
import { allPageSlugs, customPagesOf, pageLabel } from '../../src/lib/customPages.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

export async function runGuestSuiteEditor() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The guest suite editor:\n');

  // ── A CUSTOM PAGE IS A PAGE, END TO END ─────────────────────────────────
  {
    const wedding = {
      enabledPages: ['home', 'rsvp', 'welcome-drinks'],
      customPages: [{ id: 'welcome-drinks', slug: 'welcome-drinks', name: 'Welcome drinks', sections: [] }],
    };
    check('PLANT: a created page is a real slug for this wedding',
      allPageSlugs(wedding).includes('welcome-drinks'), 'through the one chokepoint');
    check('  it carries its own label rather than falling through',
      pageLabel(wedding, 'welcome-drinks') === 'Welcome drinks', 'nav renders a name, not nothing');
    check('  and a row with no slug is not a page',
      customPagesOf({ customPages: [{ name: 'no slug' }, null] }).length === 0, 'the guard in the helper');

    const left = code('src/components/website-builder/WBLeftPanel.jsx');
    check('PLANT: a custom page toggles on and off like every other page',
      /<Toggle enabled=\{enabledPages\.includes\(page\.slug\)\} onToggle=\{\(\) => toggle\(page\.slug\)\}/.test(left),
      'the same enabledPages list, the same control');
    check('  and a disabled one reads as disabled',
      /opacity: enabledPages\.includes\(page\.slug\) \? 1 : 0\.4/.test(left), 'as the built-ins do');
    check('  delete is still there, beside the toggle rather than instead of it',
      /aria-label=\{`Delete \$\{page\.name\}`\}/.test(left), 'two different intentions, two controls');

    // The nav, the preview and the published site all read the chokepoint.
    for (const f of [
      'src/components/guest-website/WeddingWebsiteNav.jsx',
      'src/components/guest-website/MultiPageWeddingWebsite.jsx',
      'src/components/website-builder/RealWebsitePreview.jsx',
    ]) check(`  ${f.split('/').pop()} reads the chokepoint`,
      /from '@\/lib\/customPages'/.test(code(f)), 'not WEDDING_PAGES');
  }

  // ── CONTROLS THAT DO NOTHING ARE NOT SHOWN ──────────────────────────────
  {
    const right = code('src/components/website-builder/WBRightPanel.jsx');
    const withTransition = Object.keys(UNIVERSE_CONFIGS)
      .filter((id) => UNIVERSE_CONFIGS[id].pageTransition !== undefined);
    check('PLANT: every universe dictates its own page transition',
      withTransition.length === Object.keys(UNIVERSE_CONFIGS).length,
      `${withTransition.length} of ${Object.keys(UNIVERSE_CONFIGS).length}`);
    check('  the published site reads the universe first',
      /universeConfig\?\.pageTransition \?\? weddingDetails\.pageTransition/.test(
        code('src/components/guest-website/MultiPageWeddingWebsite.jsx')),
      'so the couple’s choice is never reached');
    check('PLANT: so the page-transition control is gone',
      !/onChange\('pageTransition'/.test(right) && !/TRANSITION_OPTIONS/.test(right),
      'four options that did nothing');

    check('PLANT: scroll animation stays, as the on/off it actually is',
      /SCROLL_MOTION_OPTIONS/.test(right) && /onChange\('scrollAnimation', v\)/.test(right),
      'On · Off');
    check('  because that is all the site reads',
      /return weddingDetails\?\.scrollAnimation !== 'none'/.test(code('src/lib/universeStyling.js')),
      '"Subtle" and "Dramatic" rendered the same site');
    check('  and a stored "dramatic" still reads as on',
      /details\.scrollAnimation === 'none' \? 'none' : 'subtle'/.test(right),
      'nobody’s saved choice changes meaning');
  }

  // ── THE TYPOGRAPHY CONTROL ──────────────────────────────────────────────
  {
    const right = code('src/components/website-builder/WBRightPanel.jsx');
    check('PLANT: the font dropdown is the app’s small control',
      /padding: '3px 10px', borderRadius: 999,/.test(right) && /fontSize: 11, fontWeight: 600, minWidth: 0/.test(right),
      '11px, 3px/8px, fully rounded — the dashboard select');
    check('  and the font PREVIEW keeps its own size',
      /fontFamily: active\?\.family, fontSize: previewSize/.test(right),
      'showing a face at 11px would defeat previewing it');
    check('PLANT: both font roles are read by the resolver',
      /const override = weddingDetails\?\.fontOverride/.test(code('src/lib/universeStyling.js')),
      'heading and body both reach the preview');
  }

  return results;
}
