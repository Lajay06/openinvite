import { useEffect } from 'react';
import { SITE_URL, ORGANIZATION_LOGO, DEFAULT_OG_IMAGE } from '@/lib/marketingSeo';

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * useOrganizationStructuredData (AEO/SEO batch, item 3) — Organization and
 * SoftwareApplication JSON-LD. Rendered once, on the homepage only
 * (standard practice: these are site-wide facts, not per-page ones).
 *
 * Pricing here is the couple's exact, current one-time pricing as given
 * directly (USD 59/109, AUD 79/149) — deliberately not derived from
 * CurrencyContext.jsx's live FX-converted display, since that's a rough
 * "Approx." estimate for browsing, not the fixed price actually charged.
 * Machine-readable pricing here is exactly what an AI assistant will quote
 * back to a user, so it has to be the real number, not an estimate.
 *
 * No `sameAs` social profile URLs — PublicFooter.jsx's Instagram/Facebook
 * links are still placeholder `href="#"` (no real profile exists yet).
 * Add sameAs once real social URLs exist rather than inventing one now.
 */
export function useOrganizationStructuredData() {
  useEffect(() => {
    upsertJsonLd('ld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Openinvite',
      url: SITE_URL,
      logo: ORGANIZATION_LOGO,
    });

    upsertJsonLd('ld-software-application', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Openinvite',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description: 'A wedding planning app and wedding website builder with digital wedding invitations, guest management, budget tracking and an AI assistant. One-time payment, no subscription.',
      image: DEFAULT_OG_IMAGE,
      offers: [
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '59',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
        },
        {
          '@type': 'Offer',
          name: 'Ultra',
          price: '109',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '79',
          priceCurrency: 'AUD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
        },
        {
          '@type': 'Offer',
          name: 'Ultra',
          price: '149',
          priceCurrency: 'AUD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/pricing`,
        },
      ],
    });
  }, []);
}
