/**
 * tests/persistence/feature-stills.mjs
 *
 * THE PRODUCT INSIDE /features, AS RULED. Site fixes batch 3, item 4 (owner
 * rulings 2026-10-11): one real still per feature section, from the rich
 * fixture, cut to 3:2, placed in space the section already had.
 *
 * The morning band and the three stills in the deep dives are read off
 * prerendered/features, which is what a visitor is served before any script
 * runs. The two accordion rows' media only mount when a row is opened, so they
 * are read from the source that renders them.
 *
 * NO STILL ON A FEATURES SECTION (owner review of #1092, 2026-10-17): the
 * morning band and the timeline and budget stills are gone, so /features
 * serves no inline still; the vendors still in the accordion's open panel
 * stays. The map keeps every entry for the studio tour.
 *
 * What it holds:
 *   - every asset is a versioned upload, never a placeholder or a v0 path, so
 *     a reshoot is a new id (a live Cloudinary path is never overwritten)
 *   - each still sits in its own section, under that section's bullets
 *   - the frame is the site's card: square corners, no shadow
 *   - the clip is muted, looped, inline, poster first, and a poster alone
 *     under reduced motion
 *   - the clip's delivery crop is exactly 3:2
 *   - captions carry no em or en dash (the stills pass the dash rule as copy)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURE_STILLS, FEATURE_SEATING_CLIP } from '../../src/lib/featureStills.js';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const VERSIONED = /\/v[1-9]\d{5,}\/studio-tour\/(stills|tour-page)\/feature-[a-z-]+\/\d{3,4}-\d{14}/;

/** The id a still's src names, so the page can be searched for it. */
const idOf = (url) => /\/(v\d+\/studio-tour\/[^,\s"]+)/.exec(url)?.[1] || '';

export function runFeatureStills() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The product inside /features:\n');

  // ── the map ────────────────────────────────────────────────────────────
  const keys = ['morning', 'replies', 'budget', 'vendors', 'suite'];
  check('five stills, one per section', keys.every((k) => FEATURE_STILLS[k]) && Object.keys(FEATURE_STILLS).length === 5, Object.keys(FEATURE_STILLS).join(', '));
  const all = [...keys.map((k) => [k, FEATURE_STILLS[k]]), ['seating clip', FEATURE_SEATING_CLIP]];
  for (const [k, s] of all) {
    const urls = s.webm ? [s.webm, s.mp4, s.poster] : [s.src, ...s.srcSet.split(', ').map((x) => x.split(' ')[0])];
    check(`${k}: every URL is a versioned upload`, urls.every((u) => VERSIONED.test(u) && !/PENDING/.test(u)), urls[0]);
    check(`${k}: alt text and a caption`, s.alt?.length > 20 && s.caption?.length > 10);
    check(`${k}: no em or en dash in its caption or alt`, !/[–—]/.test(s.caption + s.alt), s.caption);
  }
  const crop = /c_crop,x_\d+,y_\d+,w_(\d+),h_(\d+)/.exec(FEATURE_SEATING_CLIP.webm);
  check('seating clip: the delivery crop is exactly 3:2, on all three files',
    !!crop && Number(crop[1]) * 2 === Number(crop[2]) * 3 && [FEATURE_SEATING_CLIP.mp4, FEATURE_SEATING_CLIP.poster].every((u) => u.includes(crop[0])),
    crop?.[0]);

  // ── none on the page, as served ────────────────────────────────────────
  const pre = join(ROOT, 'prerendered/features/index.html');
  const html = existsSync(pre) ? readFileSync(pre, 'utf8').replace(/&amp;/g, '&') : '';
  const figures = html.match(/<figure\b[^>]*data-feature-still="still"[\s\S]*?<\/figure>/g) || [];
  check('prerendered /features carries no inline still', !!html && figures.length === 0, `${figures.length} figures`);
  check('the morning band is gone', !html.includes('data-dashboard-band') && !html.includes(idOf(FEATURE_STILLS.morning.src)));
  for (const k of ['replies', 'budget', 'suite']) {
    check(`${k}: not on the page`, !html.includes(idOf(FEATURE_STILLS[k].src)));
  }
  check('timeline and budget render no still under their bullets',
    !/FeatureStill|FEATURE_STILLS/.test(stripComments(read('src/components/home/FeatureTimeline.jsx')) + stripComments(read('src/components/home/FeatureBudget.jsx'))));
  const features = stripComments(read('src/pages/Features.jsx'));
  // The seating clip left the accordion on 2026-10-16 (the Seating row shows
  // the job now); the clip stays in the map for the studio tour.
  check('vendors row carries the vendors still, and the seating row no clip',
    /title: "Vendors and the marketplace", still: FEATURE_STILLS\.vendors,/.test(features) && /title: "Seating chart and the visualizer", bullets:/.test(features) && !/FEATURE_SEATING_CLIP/.test(features));
  check('accordion media sits inside the open panel only, at 480 wide',
    /openFeature === i &&[\s\S]*?<\/ul>\s*\{\(f\.still \|\| f\.clip\) &&\s*<div style=\{\{ maxWidth: 480 \}\}>/.test(features));

  // ── the frame ──────────────────────────────────────────────────────────
  const comp = stripComments(read('src/components/marketing/FeatureStill.jsx'));
  check('the frame has square corners and no shadow', !/borderRadius|boxShadow|rounded|shadow-/.test(comp));
  check('the clip is muted, looped, inline, with a poster',
    /<video\b[^>]*\bautoPlay\b[^>]*\bmuted\b[^>]*\bloop\b[^>]*\bplaysInline\b[^>]*poster=\{clip\.poster\}/.test(comp));
  check('under reduced motion the clip is its poster, not a video',
    /reducedMotion\(\) \? \(\s*<img src=\{clip\.poster\}/.test(comp));

  return r;
}
