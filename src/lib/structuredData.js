/**
 * Shared JSON-LD upsert helper (AEO/SEO batch). Used by
 * useOrganizationStructuredData.js and useFaqStructuredData.js so both
 * hooks create/update a <script type="application/ld+json"> by id instead
 * of each re-implementing the same three lines.
 */
export function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}
