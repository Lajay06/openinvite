import { useEffect } from 'react';
import { upsertJsonLd } from '@/lib/structuredData';

/**
 * useFaqStructuredData (AEO/SEO batch, item 3/4) — FAQPage JSON-LD for
 * the FAQ page, built from the same { q, a } array the page renders, so
 * the visible prose and the machine-readable copy can never drift apart.
 */
export function useFaqStructuredData(faqs) {
  useEffect(() => {
    upsertJsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }, [faqs]);
}
