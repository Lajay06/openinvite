/**
 * tests/persistence/app-marketing.mjs
 *
 * THE MARKETING SITE SAYS THERE IS AN APP, IN THE OWNER'S WORDS, AND LINKS
 * TO NO STORE YET.
 *
 * goals/2026-10-10-app-on-the-marketing-site.md. Read off prerendered/, which
 * is what a visitor is served before any script runs, so the copy is checked
 * on the page and not in a component that might not be mounted.
 *
 * THE ABSENCE IS ASSERTED, NOT ASSUMED. The app is in neither store, so until
 * the owner supplies the links no page may carry a link or an image pointing
 * at apps.apple.com or play.google.com; every place a badge would go carries
 * the plain store line instead.
 *
 * Each item of the goal extends this guard: item 1 is the home block.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STILLS } from '../../src/lib/studioTour.js';
import { MARKETING_ROUTES } from '../../scripts/marketingRoutes.mjs';
import { PRO_FEATURES, ULTRA_EXTRAS } from '../../src/lib/planFeatures.js';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRE = resolve(ROOT, 'prerendered');
export const STORE_LINE = 'Coming to the App Store and Google Play at launch.';
const STORE_HOSTS = /apps\.apple\.com|play\.google\.com/i;

/** The text of an HTML string, tags out and entities for quotes decoded. */
function textOf(html) {
  return html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** The inner HTML of the first element carrying `attr`, by tag depth. */
function sectionWith(html, attr) {
  const at = html.indexOf(attr);
  if (at < 0) return '';
  const open = html.lastIndexOf('<', at);
  const tag = /^<([a-z0-9]+)/i.exec(html.slice(open))?.[1];
  if (!tag) return '';
  let depth = 0;
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = open;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(open, re.lastIndex);
  }
  return '';
}

/**
 * The title banner directly above an app section (site fixes batch 2, item 2):
 * the last data-title-banner before `attr`, with nothing but its own markup
 * between them. Returns its outer HTML, or '' if the section has no banner.
 */
function bannerAbove(html, attr) {
  const at = html.indexOf(attr);
  if (at < 0) return '';
  const b = html.lastIndexOf('data-title-banner', at);
  if (b < 0) return '';
  const banner = sectionWith(html.slice(b - 200), 'data-title-banner');
  const end = html.indexOf(banner) + banner.length;
  const between = html.slice(end, html.lastIndexOf('<', at)).replace(/<!--[\s\S]*?-->/g, '').trim();
  return between === '' ? banner : '';
}
const AVA_GRADIENT = 'linear-gradient(to right, #DDF762, #F0A050, #D4896A, #C99BBF, #9B59CC)';
const bannerChecks = (check, banner, where, text, level) => {
  check(`${where}: a title banner opens the app section`, !!banner);
  check(`${where}: the banner is the Ava section's, gradient and heights`,
    banner.includes('rgb(221, 247, 98)') || banner.includes('#DDF762') || banner.includes(AVA_GRADIENT), 'gradient');
  check(`${where}: the banner carries "${text}" as its ${level}`,
    new RegExp(`<${level}\\b[^>]*>\\s*${text.replace(/[.,]/g, (c) => '\\' + c)}\\s*</${level}>`).test(banner));
};

function htmlFiles(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

export function runAppMarketing() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The app on the marketing site, as prerendered:\n');

  // ── no store link or badge anywhere, until the owner supplies them ────
  const pages = existsSync(PRE) ? htmlFiles(PRE) : [];
  const withStore = pages.filter((p) => STORE_HOSTS.test(readFileSync(p, 'utf8')));
  check('no marketing page links to or shows an App Store or Google Play asset',
    pages.length > 0 && withStore.length === 0,
    withStore.length ? withStore.map((p) => p.slice(PRE.length + 1)).join(', ') : `${pages.length} pages`);

  // ── item 1: the home block ─────────────────────────────────────────────
  const home = existsSync(join(PRE, 'index.html')) ? readFileSync(join(PRE, 'index.html'), 'utf8') : '';
  const block = sectionWith(home, 'data-home-app');
  check('home: the app block is on the page', !!block);
  const t = textOf(block);
  bannerChecks(check, bannerAbove(home, 'data-home-app'), 'home', 'The whole planner, in your pocket.', 'h2');
  check('home: the heading is in the banner, not repeated in the section', !t.includes('The whole planner, in your pocket.'));
  check('home: the body, verbatim', t.includes('Plan on the train, on the couch, in the queue for coffee. The guest list, the budget, the seating chart and Ava are all on your phone, and a reply from a guest reaches you the moment it lands. Your guests never need the app; they open a link.'));
  check('home: the store line, as text', t.includes(STORE_LINE) && /data-app-store-line/.test(block));
  check('home: the store line is not a link', !/<a\b[^>]*>[^<]*Coming to the App Store/.test(block));
  const imgs = [...block.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  check('home: one picture, and no video', imgs.length === 1 && !/<video\b/.test(block), `${imgs.length} img`);
  check('home: the picture is the daily update still at 390, with no cursor',
    imgs[0] === STILLS['daily-update'], String(imgs[0]).slice(-60));
  const blockAt = home.indexOf('data-home-app');
  const pricingAt = home.indexOf('section-pricing');
  const cardsAt = home.indexOf('section-features');
  check('home: after the six cards and before pricing',
    cardsAt > -1 && blockAt > cardsAt && pricingAt > blockAt, `cards ${cardsAt}, app ${blockAt}, pricing ${pricingAt}`);

  // ── items 2 and 4: the phones, the lines, /app and the footer ─────────
  const LINES = [
    'The morning page that tells you what today needs.',
    'The guest list, with replies arriving as they happen.',
    'The seating chart, wherever you are.',
    'The budget, with every vendor payment and what is still owed.',
    'Ava on every page, at any hour.',
  ];
  const DESKTOP = 'You design your guest suite on a desktop, where the space is; everything else is yours wherever you are.';
  const PHONES = [STILLS['daily-update'], STILLS['guests-reply'], STILLS.budget];
  const phonesBlock = (html, where) => {
    const b = sectionWith(html, 'data-app-phones');
    const bt = textOf(b);
    check(`${where}: the app section is on the page`, !!b);
    bannerChecks(check, bannerAbove(html, 'data-app-phones'), where, 'Everything, on your phone', where === '/app' ? 'h1' : 'h2');
    const lines = [...b.matchAll(/<li\b[^>]*data-app-line[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]).trim());
    check(`${where}: the five lines, verbatim and in order`, JSON.stringify(lines) === JSON.stringify(LINES), JSON.stringify(lines).slice(0, 120));
    check(`${where}: the desktop sentence, verbatim`, bt.includes(DESKTOP));
    const srcs = [...b.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    check(`${where}: three phones: daily update, guest list, budget`, JSON.stringify(srcs) === JSON.stringify(PHONES), `${srcs.length} img`);
    return b;
  };
  const features = existsSync(join(PRE, 'features/index.html')) ? readFileSync(join(PRE, 'features/index.html'), 'utf8') : '';
  const fb = phonesBlock(features, 'features');
  check('features: the store line, as text', textOf(fb).includes(STORE_LINE) && /data-app-store-line/.test(fb));
  // The accordion's first row, as the anchor: the app section sits above it
  // and is not one of its rows.
  const accAt = features.indexOf('Vendors and the marketplace');
  const appAt = features.indexOf('data-app-phones');
  check('features: a section of its own, above the accordion', appAt > -1 && accAt > appAt, `app ${appAt}, accordion ${accAt}`);

  const appHtml = existsSync(join(PRE, 'app/index.html')) ? readFileSync(join(PRE, 'app/index.html'), 'utf8') : '';
  check('/app: prerendered', !!appHtml);
  const ab = phonesBlock(appHtml, '/app');
  check('/app: one h1 on the page', (appHtml.match(/<h1\b/g) || []).length === 1);
  const guests = textOf(sectionWith(appHtml, 'data-app-guests'));
  check('/app: "Do my guests need it?" with its body, verbatim',
    guests.includes('Do my guests need it?') && guests.includes('No. Your guests open a link and reply in a browser. Nobody has to make an account or install anything to come to your wedding.'));
  check('/app: the store line, as text, after the guests block', guests.includes(STORE_LINE));
  check('/app: in MARKETING_ROUTES', MARKETING_ROUTES.includes('/app'));
  const sitemap = existsSync(join(PRE, 'sitemap.xml')) ? readFileSync(join(PRE, 'sitemap.xml'), 'utf8') : '';
  check('/app: in sitemap.xml', /\/app<\/loc>/.test(sitemap));
  check('/app: not noindexed', !!appHtml && !/<meta name="robots"[^>]*noindex/i.test(appHtml));
  check('/app: its title', /<title>Openinvite \| The app<\/title>/.test(appHtml));
  check('/app: its description', appHtml.includes('content="The Openinvite wedding planner on your phone: guests, replies, seating, budget, vendors, schedule and Ava. iPhone and Android, included with every plan. Guests never need it."'));
  // EVERY PAGE THAT HAS THE MARKETING FOOTER. The auth pages (login, register,
  // forgot password) render none, so there is nothing to add the link to
  // there; the count pins how many pages do, so a footer that appears on a new
  // page without the link still fails.
  const withFooter = pages.filter((p) => /data-public-footer/.test(readFileSync(p, 'utf8')));
  const noFooterLink = withFooter.filter((p) => !/<a\b[^>]*href="\/app"[^>]*>The app<\/a>/.test(readFileSync(p, 'utf8')));
  check('the footer links to /app as "The app" on every page that has the marketing footer',
    withFooter.length >= 13 && noFooterLink.length === 0,
    noFooterLink.length ? noFooterLink.map((p) => p.slice(PRE.length + 1)).join(', ') : `${withFooter.length} of ${pages.length} pages carry the footer`);

  // ── item 3: the pricing line ──────────────────────────────────────────
  const pricing = existsSync(join(PRE, 'pricing/index.html')) ? readFileSync(join(PRE, 'pricing/index.html'), 'utf8') : '';
  const planLines = [...pricing.matchAll(/<li\b[^>]*data-plan-app[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]).trim());
  check('pricing: each of the two plan cards says "Includes the app."',
    planLines.length === 2 && planLines.every((t) => t === 'Includes the app.'), JSON.stringify(planLines));
  check('pricing: the line appears nowhere else on the page',
    (textOf(pricing).match(/Includes the app\./g) || []).length === 2);

  // ── marketing copy fixes (owner rulings 2026-10-10) ──────────────────
  // The FAQ answers and some lists only render when opened, so the questions
  // are read from the prerendered page and the answers from the source.
  const faqHtml = existsSync(join(PRE, 'faq/index.html')) ? readFileSync(join(PRE, 'faq/index.html'), 'utf8') : '';
  const faqSrc = readFileSync(resolve(ROOT, 'src/pages/FAQ.jsx'), 'utf8');
  check('faq: "Is there an app?" is asked, right after "What is Openinvite?"',
    textOf(faqHtml).includes('Is there an app?')
      && faqSrc.indexOf('q: "Is there an app?"') > faqSrc.indexOf('q: "What is Openinvite?"')
      && !/q: "[^"]+",[\s\S]*?q: "Is there an app\?"/.test(faqSrc.slice(faqSrc.indexOf('q: "What is Openinvite?"') + 30, faqSrc.indexOf('q: "Is there an app?"') + 30)));
  check('faq: its answer, verbatim', faqSrc.includes('a: "Yes, for iPhone and Android. It is coming to the App Store and Google Play at launch. You design your guest suite on a desktop, where the space is; the guest list, replies, budget and seating chart are yours on your phone."'));
  check('faq: "What is Openinvite?" says a wedding planner, on the web and on your phone',
    faqSrc.includes('Openinvite is a wedding planner, on the web and on your phone') && !faqSrc.includes('a wedding planning app'));
  const pricingSrc = readFileSync(resolve(ROOT, 'src/pages/Pricing.jsx'), 'utf8');
  check('pricing: "Is the app included?" is asked', textOf(pricing).includes('Is the app included?'));
  check('pricing: its answer, verbatim', pricingSrc.includes('a: "Yes. Both plans include the app at no extra cost, and it is coming to the App Store and Google Play at launch."'));
  check('pricing: the comparison table has one "Guest suite" row', (pricingSrc.match(/feature: "Guest suite"/g) || []).length === 1);
  check('plan features: "Digital invitations by email", and no WhatsApp',
    ULTRA_EXTRAS.includes('Digital invitations by email') && ![...PRO_FEATURES, ...ULTRA_EXTRAS].some((f) => /whats\s?app/i.test(f)));
  // NEITHER WORD ON ANY MARKETING PAGE: the served pages, and the sources
  // behind copy that only renders when opened.
  const MARKETING_SOURCES = ['src/pages/Home.jsx', 'src/pages/Features.jsx', 'src/pages/Ava.jsx', 'src/pages/Pricing.jsx',
    'src/pages/Universes.jsx', 'src/pages/About.jsx', 'src/pages/Contact.jsx', 'src/pages/FAQ.jsx', 'src/pages/Gifting.jsx',
    'src/pages/Tour.jsx', 'src/pages/AppPage.jsx', 'src/lib/planFeatures.js',
    ...readdirSync(resolve(ROOT, 'src/components/home')).map((f) => `src/components/home/${f}`),
    ...readdirSync(resolve(ROOT, 'src/components/marketing')).map((f) => `src/components/marketing/${f}`)];
  // Comments may name the word to say it is gone; copy may not. The shared
  // stripper, not a hand-written one (the ratchet from #925).
  const copyOf = (src) => stripComments(src);
  for (const [word, re] of [['WhatsApp', /whats\s?app/i], ['shareable', /shareable/i]]) {
    const onPages = pages.filter((p) => re.test(textOf(readFileSync(p, 'utf8'))));
    const inSources = MARKETING_SOURCES.filter((f) => re.test(copyOf(readFileSync(resolve(ROOT, f), 'utf8'))));
    check(`"${word}" appears on no marketing page`, onPages.length === 0 && inSources.length === 0,
      [...onPages.map((p) => p.slice(PRE.length + 1)), ...inSources].join(', ') || `${pages.length} pages, ${MARKETING_SOURCES.length} sources`);
  }

  return r;
}
