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

  // ── the four stills, as served ─────────────────────────────────────────
  const pre = join(ROOT, 'prerendered/features/index.html');
  const html = existsSync(pre) ? readFileSync(pre, 'utf8').replace(/&amp;/g, '&') : '';
  const figures = html.match(/<figure\b[^>]*data-feature-still="still"[\s\S]*?<\/figure>/g) || [];
  // Three since 2026-10-16: the replies still went with Advanced guest
  // management, whose place the Replies and Seating rows took.
  check('prerendered /features carries the three inline stills', figures.length === 3, `${figures.length} figures`);
  for (const k of ['budget', 'suite']) {
    const s = FEATURE_STILLS[k];
    const fig = figures.find((f) => f.includes(idOf(s.src))) || '';
    check(`${k}: on the page, 552 and 1104 wide, with its caption`,
      !!fig && fig.includes(`w_552/${idOf(s.src)} 552w`) && fig.includes(`w_1104/${idOf(s.src)} 1104w`) && fig.replace(/&#x27;/g, "'").includes(s.caption));
  }

  // ── where each one sits ────────────────────────────────────────────────
  const under = (file, name) => {
    const src = stripComments(read(file));
    const ul = src.lastIndexOf('</ul>', src.indexOf(name));
    return src.indexOf(name) > 0 && ul > 0 && !/<(section|div)\b/.test(src.slice(ul, src.indexOf(name)));
  };
  // THE MORNING BAND (owner ruling 2026-10-12): full width at the top of the
  // dashboard section, 2:1, outside the one-screen row, with the owner's caption.
  const band = /<div\b[^>]*data-dashboard-band[^>]*>([\s\S]*?<\/figure>)/.exec(html)?.[1] || '';
  const mid = idOf(FEATURE_STILLS.morning.src);
  check('morning page: the band above the dashboard row, 2:1, 1312, 656 and 2624 wide',
    band.includes(`w_1312/${mid} 1312w`) && band.includes(`w_2624/${mid} 2624w`) && band.includes(`w_656/${mid} 656w`) && /aspect-ratio:\s*2\s*\/\s*1/.test(band));
  check('morning page: the caption is the owner\'s', FEATURE_STILLS.morning.caption === 'Every morning, one sentence tells you what today needs.' && band.includes(FEATURE_STILLS.morning.caption));
  const dash = html.indexOf('data-dashboard-band');
  check('morning page: the band comes straight before the Customizable Dashboard row, not inside it',
    dash > 0 && html.indexOf('Customizable Dashboard', dash) > dash && !/<section\b[^>]*lg:flex-row[^>]*>(?:(?!<\/section>)[\s\S])*data-dashboard-band/.test(html));
  check('replies: gone with Advanced guest management', !existsSync(join(ROOT, 'src/components/home/FeatureGuests.jsx')) && !html.includes(idOf(FEATURE_STILLS.replies.src)));
  check('budget: under the budget bullets, on the dark ground', under('src/components/home/FeatureBudget.jsx', 'still={FEATURE_STILLS.budget} dark'));
  check('suite: under the timeline bullets', under('src/components/home/FeatureTimeline.jsx', 'still={FEATURE_STILLS.suite}'));
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
