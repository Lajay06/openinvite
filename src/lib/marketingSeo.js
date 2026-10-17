/**
 * src/lib/marketingSeo.js
 *
 * Single source of truth for per-page SEO/AEO metadata on the marketing
 * site (AEO/SEO batch, item 2). Consumed by useMarketingSeo.js at render
 * time (so real visitors get correct tab titles when navigating client-
 * side) and captured as-is by scripts/prerender.mjs's build-time snapshot
 * (so crawlers with no JS get the same titles/descriptions).
 *
 * Keep titles/descriptions here, not scattered across page components —
 * this is also what scripts/generate-sitemap.mjs and the prerender route
 * list are built from, so a route only needs to be added in one place.
 */

export const SITE_URL = 'https://www.openinvite.com.au';

// A real captured product screenshot (guest RSVP flow), not a placeholder —
// see IMAGE_MANIFEST.md conventions elsewhere in this repo for why a real
// asset is preferred over a generic graphic. Cropped to the standard
// 1200x630 Open Graph ratio via Cloudinary's own transform, not a
// pre-cropped upload.
export const DEFAULT_OG_IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload/c_fill,w_1200,h_630,q_auto,f_auto/product-shots/flow-03-guest-rsvp-poster.jpg';

export const ORGANIZATION_LOGO = `${SITE_URL}/openinvite-logo.png`;

// route -> { title, description }. Title is used as-is (already sentence
// case, no trailing site-name suffix needed since the brand name is
// already the first word). Description targets ~150-160 characters,
// working in "wedding planning platform", "guest suite builder", "digital
// wedding invitations" or "pay once" where it reads naturally for that page.
export const MARKETING_PAGE_SEO = {
  '/': {
    title: 'Openinvite: the wedding planning platform',
    // Verbatim AEO answer capsule — previously also rendered as visible hero
    // subtext on Home (src/components/home/HeroCollage.jsx); now lives only
    // here and in public/llms.txt so the exact wording stays crawler-facing
    // without duplicating on the visible page.
    description: 'Openinvite is a wedding planning platform with a one-time payment: planning tools, guest management, digital invitations, a Guest Suite and an AI assistant.',
  },
  '/features': {
    title: 'Openinvite | Features',
    description: "Explore Openinvite's wedding planning features: guest management, budget tracking, a Guest Suite builder, digital wedding invitations and 20 design themes, all in one platform.",
  },
  '/ava': {
    title: 'Openinvite | Ava',
    description: 'Ava is the AI wedding assistant built into Openinvite. Ava helps with your wedding checklist, budget suggestions, vow writing and planning advice, personalized to your wedding.',
  },
  '/universes': {
    title: 'Openinvite | Universes',
    description: "Choose from 20 fully designed Guest Suite themes in Openinvite. Each universe sets the fonts, colors and style for your Guest Suite, invitations and printed pieces.",
  },
  '/pricing': {
    title: 'Openinvite | Pricing',
    description: "Openinvite pricing is a one-time payment, not a subscription. See what's included in the Pro and Ultra plans for your wedding planning platform and your Guest Suite.",
  },
  // THE GIFT FLOW ITSELF (owner ruling 2026-10-16): /gift had no entry, so it
  // kept whatever title and canonical the page before it left behind.
  '/gift': {
    title: 'Openinvite | Give a gift',
    description: 'Give a couple Openinvite Pro or Ultra. Choose a plan, add a photo and a note, pay once, and they get an email that switches it on for 24 months.',
  },
  '/gifting': {
    title: 'Openinvite | Gifting',
    description: 'Give a couple the gift of Openinvite Pro or Ultra. Pay once, add a photo and a note, and they get an email that switches their plan on for 24 months.',
  },
  '/contact': {
    title: 'Openinvite | Contact',
    description: "Get in touch with Openinvite. We're here to help with questions about wedding planning, your Guest Suite or your account.",
  },
  '/tour': {
    title: 'Openinvite | Tour the studio',
    description: 'A short tour of the Openinvite studio in four moments: the daily update, guest replies, seating and your Guest Suite. Nothing to sign up for.',
  },
  '/app': {
    title: 'Openinvite | The app',
    description: 'The Openinvite wedding planner on your phone: guests, replies, seating, budget, vendors, schedule and Ava. iPhone and Android, included with every plan. Guests never need it.',
  },
  '/about': {
    title: 'Openinvite | About',
    description: 'Openinvite is a wedding planning platform built for modern couples. Learn about our story and why we built a wedding planning platform that matches the occasion.',
  },
  '/privacy-policy': {
    title: 'Openinvite | Privacy policy',
    description: "Read Openinvite's privacy policy to understand how we collect, use and protect your data as a wedding planning platform.",
  },
  '/terms-of-service': {
    title: 'Openinvite | Terms of service',
    description: 'Read the terms of service for using Openinvite, the wedding planning platform and Guest Suite builder.',
  },
  '/login': {
    title: 'Openinvite | Log in',
    description: 'Log in to your Openinvite account to continue planning your wedding.',
  },
  '/register': {
    title: 'Openinvite | Create account',
    description: 'Create a free Openinvite account and start planning your wedding today.',
  },
  '/forgot-password': {
    title: 'Openinvite | Reset password',
    description: 'Reset your Openinvite account password.',
  },
  '/faq': {
    title: 'Openinvite | FAQ',
    description: 'Answers to common questions about Openinvite: pricing, what is included in Pro and Ultra, design universes, Ava, collaborators, guest RSVPs and currencies.',
  },
};

// EACH PAGE'S OWN SHARE IMAGE (consumer launch goal, item 6, 2026-10-16):
// a link to /pricing used to unfurl as the same RSVP poster as every other
// page. Each marketing page now shares its own hero photograph, the one a
// visitor sees first, cropped by Cloudinary to the 1200 by 630 card, as a
// JPEG for the crawlers that read nothing else. Home keeps the poster; so do
// the FAQ, which has no hero, and the legal and sign-in pages.
const SHARE_PHOTOS = {
  '/features': 'v1779185631/DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx',
  '/ava': 'v1779217006/DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6161_isrtef',
  '/universes': 'DTS_ISOLA_Daniel_Far%C3%B2_Photos_ID13172_fu4zfe',
  '/pricing': 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_-_Print_ew6e2a',
  '/gifting': 'DTS_SNOWBOUND_Daniel_Faro_4k_i1ojvs',
  '/gift': 'DTS_SNOWBOUND_Daniel_Faro_4k_i1ojvs',
  '/contact': 'DTS_Weirdly_Ever_After_Agust%C3%ADn_Far%C3%ADas_Photos_ID8960_nspx4l',
  '/tour': 'DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2',
  '/app': 'DTS_STAYCATION_Mathew_Addington_Photos_ID3369_l8e9dm',
  '/about': 'DTS_Modern_Home_Rob_Christain_Crosby_Photos_ID3654_h6b8gy',
};

/** The share image for a route: its hero at 1200 by 630, else the poster. */
export function getShareImage(pathname) {
  const id = SHARE_PHOTOS[pathname];
  return id ? `https://res.cloudinary.com/dsr84xknv/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/${id}` : DEFAULT_OG_IMAGE;
}

export function getMarketingSeo(pathname) {
  return MARKETING_PAGE_SEO[pathname] || MARKETING_PAGE_SEO['/'];
}
