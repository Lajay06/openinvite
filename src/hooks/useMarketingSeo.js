import { useEffect } from 'react';
import { SITE_URL, DEFAULT_OG_IMAGE, getMarketingSeo } from '@/lib/marketingSeo';

function setMetaByName(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * useMarketingSeo (AEO/SEO batch, item 2) — sets document.title, meta
 * description, canonical URL, and Open Graph/Twitter card tags for the
 * current marketing page, reading from the single marketingSeo.js config.
 *
 * Two consumers of the same effect: a real visitor navigating client-side
 * (so the browser tab title updates correctly instead of staying stuck on
 * whatever page loaded first), and scripts/prerender.mjs's Playwright
 * snapshot (which waits for this effect to run before capturing the DOM,
 * so the prerendered HTML a crawler receives already has the right tags
 * baked in, no JS execution required on their end).
 *
 * Call once per marketing page component, no arguments needed — reads the
 * route from window.location.pathname so the same call works whether the
 * page is reached via client-side navigation or a fresh load.
 */
export function useMarketingSeo() {
  useEffect(() => {
    const pathname = window.location.pathname;
    const { title, description } = getMarketingSeo(pathname);
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

    document.title = title;
    setMetaByName('description', description);
    setCanonical(canonicalUrl);

    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:url', canonicalUrl);
    setMetaByProperty('og:type', 'website');
    setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
    setMetaByProperty('og:site_name', 'Openinvite');

    setMetaByName('twitter:card', 'summary_large_image');
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
    setMetaByName('twitter:image', DEFAULT_OG_IMAGE);
  }, [window.location.pathname]);
}
