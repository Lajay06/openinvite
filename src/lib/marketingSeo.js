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
// working in "wedding planning platform", "wedding website builder", "digital
// wedding invitations" or "pay once" where it reads naturally for that page.
export const MARKETING_PAGE_SEO = {
  '/': {
    title: 'Openinvite: the wedding planning platform',
    // Verbatim AEO answer capsule — previously also rendered as visible hero
    // subtext on Home (src/components/home/HeroCollage.jsx); now lives only
    // here and in public/llms.txt so the exact wording stays crawler-facing
    // without duplicating on the visible page.
    description: 'Openinvite is a wedding planning platform with a one-time payment: planning tools, guest management, digital invitations, a wedding website and an AI assistant.',
  },
  '/features': {
    title: 'Openinvite | Features',
    description: "Explore Openinvite's wedding planning features: guest management, budget tracking, a wedding website builder, digital wedding invitations and 20 design themes, all in one platform.",
  },
  '/ava': {
    title: 'Openinvite | Ava',
    description: 'Ava is the AI wedding assistant built into Openinvite. Ava helps with your wedding checklist, budget suggestions, vow writing and planning advice, personalized to your wedding.',
  },
  '/universes': {
    title: 'Openinvite | Universes',
    description: "Choose from 20 fully designed wedding website themes in Openinvite. Each universe sets the fonts, colors and style for your wedding website, invitations and printed pieces.",
  },
  '/pricing': {
    title: 'Openinvite | Pricing',
    description: "Openinvite pricing is a one-time payment, not a subscription. See what's included in the Pro and Ultra plans for your wedding planning platform and wedding website.",
  },
  '/gifting': {
    title: 'Openinvite | Gifting',
    description: 'Give a couple the gift of Openinvite, a wedding planning platform with a one-time payment. Request a gift code and they redeem it at checkout, no subscription required.',
  },
  '/contact': {
    title: 'Openinvite | Contact',
    description: "Get in touch with Openinvite. We're here to help with questions about wedding planning, your wedding website or your account.",
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
    description: 'Read the terms of service for using Openinvite, the wedding planning platform and wedding website builder.',
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

export function getMarketingSeo(pathname) {
  return MARKETING_PAGE_SEO[pathname] || MARKETING_PAGE_SEO['/'];
}
