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

export const ORGANIZATION_LOGO = 'https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png';

// route -> { title, description }. Title is used as-is (already sentence
// case, no trailing site-name suffix needed since the brand name is
// already the first word). Description targets ~150-160 characters,
// working in "wedding planning app", "wedding website builder", "digital
// wedding invitations" or "pay once" where it reads naturally for that page.
export const MARKETING_PAGE_SEO = {
  '/': {
    title: 'Openinvite: the wedding planning app with one-time pricing',
    description: 'Openinvite is a wedding planning app and wedding website builder with digital wedding invitations, guest management and an AI assistant. Pay once and plan everything, no subscription.',
  },
  '/features': {
    title: 'Features: everything you need to plan your wedding',
    description: "Explore Openinvite's wedding planning features: guest management, budget tracking, a wedding website builder, digital wedding invitations and 20 design themes, all in one app.",
  },
  '/ava': {
    title: 'Meet Ava, your AI wedding planning assistant',
    description: 'Ava is the AI wedding assistant built into Openinvite. She helps with your wedding checklist, budget suggestions, vow writing and planning advice, personalised to your wedding.',
  },
  '/universes': {
    title: '20 wedding website design themes to choose from',
    description: "Choose from 20 fully designed wedding website themes in Openinvite. Each universe sets the fonts, colours and style for your wedding website, invitations and printed pieces.",
  },
  '/pricing': {
    title: 'Pricing: pay once, plan your whole wedding',
    description: "Openinvite pricing is a one-time payment, not a subscription. See what's included in the Pro and Ultra plans for your wedding planning app and wedding website.",
  },
  '/contact': {
    title: 'Contact Openinvite',
    description: "Get in touch with the Openinvite team. We're here to help with questions about wedding planning, your wedding website or your account.",
  },
  '/about': {
    title: 'About Openinvite',
    description: 'Openinvite is a wedding planning app built for modern couples. Learn about our story and why we built a wedding planning platform that matches the occasion.',
  },
  '/privacy-policy': {
    title: 'Openinvite privacy policy',
    description: "Read Openinvite's privacy policy to understand how we collect, use and protect your data as a wedding planning app.",
  },
  '/terms-of-service': {
    title: 'Openinvite terms of service',
    description: 'Read the terms of service for using Openinvite, the wedding planning app and wedding website builder.',
  },
  '/login': {
    title: 'Log in to Openinvite',
    description: 'Log in to your Openinvite account to continue planning your wedding.',
  },
  '/register': {
    title: 'Create your Openinvite account',
    description: 'Create a free Openinvite account and start planning your wedding today.',
  },
  '/forgot-password': {
    title: 'Reset your Openinvite password',
    description: 'Reset your Openinvite account password.',
  },
};

export function getMarketingSeo(pathname) {
  return MARKETING_PAGE_SEO[pathname] || MARKETING_PAGE_SEO['/'];
}
