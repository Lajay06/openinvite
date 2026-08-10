/**
 * Shared between VendorMarketplace.jsx (dashboard vendor discovery) and
 * OnboardingPathAVendors.jsx (onboarding's trimmed version of the same
 * search) — the single place that maps a Google Places search result onto
 * a Vendor entity write, and the single place category labels are defined
 * and reconciled against the Vendor schema's category enum. Before this,
 * VendorMarketplace.jsx's own handleSave silently dropped google_place_id,
 * rating, phone, and address even though the schema has fields for all of
 * them — and its CATEGORIES list had drifted from the schema enum in
 * several places (Florals vs flowers, Hair & makeup vs beauty, Venues vs
 * venue, Cake vs bakery, Music & DJ vs music, Transport vs transportation,
 * Celebrant/Stationery/Jewellery not in the enum at all). Both bugs shared
 * the same root cause — a category label and a save mapping that only
 * existed once, un-reused — so both are fixed here, once.
 */
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';

export const CATEGORIES = [
  'All', 'Photography', 'Videography', 'Catering', 'Florals',
  'Styling', 'Hair & makeup', 'Music & DJ', 'Entertainment',
  'Venues', 'Transport', 'Celebrant', 'Stationery', 'Cake', 'Jewellery', 'Other',
];

export const CATEGORY_QUERIES = {
  'Photography': 'wedding photographer',
  'Videography': 'wedding videographer filmmaker',
  'Catering': 'wedding catering caterer',
  'Florals': 'wedding florist',
  'Styling': 'wedding stylist event planner',
  'Hair & makeup': 'bridal hair makeup artist',
  'Music & DJ': 'wedding DJ band music',
  'Entertainment': 'wedding entertainment performer',
  'Venues': 'wedding venue function center',
  'Transport': 'wedding car hire chauffeur',
  'Celebrant': 'wedding celebrant officiant',
  'Stationery': 'wedding stationery invitations',
  'Cake': 'wedding cake bakery',
  'Jewellery': 'engagement ring jewellery',
  'Other': 'wedding vendor',
};

// Vendor.jsonc's category enum: venue, catering, photography, videography,
// flowers, music, bakery, transportation, beauty, attire, planning,
// decorations, entertainment, other. Styling maps to 'planning' (its own
// CATEGORY_QUERIES text is "wedding stylist event planner"); Celebrant,
// Stationery, and Jewellery have no real match in the enum and fall back
// to 'other' rather than writing a value the schema doesn't recognise.
export const CATEGORY_TO_SCHEMA = {
  'Photography': 'photography',
  'Videography': 'videography',
  'Catering': 'catering',
  'Florals': 'flowers',
  'Styling': 'planning',
  'Hair & makeup': 'beauty',
  'Music & DJ': 'music',
  'Entertainment': 'entertainment',
  'Venues': 'venue',
  'Transport': 'transportation',
  'Celebrant': 'other',
  'Stationery': 'other',
  'Cake': 'bakery',
  'Jewellery': 'other',
  'Other': 'other',
};

export function schemaCategory(label) {
  return CATEGORY_TO_SCHEMA[label] || 'other';
}

/**
 * The google_place_id values this couple has already added. Callers seed
 * their own "already added" set from this on mount, so a vendor that's
 * already in My vendors reads as added instead of offering a fresh add that
 * would write a second copy of the same business.
 *
 * The place_id namespace is shared end to end: /api/places-search returns
 * `place_id`, the marketplace maps it to both `vendor.id` and
 * `vendor.placeId`, and it's stored verbatim as Vendor.google_place_id — so
 * these ids can be compared against a result list directly, with no mapping.
 *
 * @returns {Promise<Set<string>>}
 */
export async function getSavedPlaceIds() {
  const rows = await getMyRecords('Vendor');
  return new Set(rows.map(v => v.google_place_id).filter(Boolean));
}

/**
 * This couple's existing Vendor record for a given Places id, or null.
 * Owner-scoped the same way getMyRecords is — a place saved by a different
 * account is not a duplicate of this one.
 */
async function findMyVendorByPlaceId(placeId) {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) return null;
  const rows = await base44.entities.Vendor
    .filter({ created_by_id: me.id, google_place_id: placeId })
    .catch(() => []);
  return (rows || []).find(r => !r.is_test) || null;
}

// `vendor` is a mapped /api/places-search list item (id, placeId, name,
// category, rating, reviewCount, location, website, phone — the last two
// always null there, Text Search doesn't return them). `details` is the
// optional /api/place-details response (richer phone/address/rating) —
// passed when the caller already fetched it (the profile modal), omitted
// when saving straight from a search-result card. Prefers `details` when
// present since it's fresher and more complete.
//
// Deduped at the write, not just in the caller's UI state. Every caller
// keeps a local set of ids it has already added this session, but that set
// is component state: it starts empty on every mount, so a reload, a second
// tab, or an add that happened during onboarding all left the button
// offering a fresh add — and google_place_id was written but never checked,
// so accepting it created a duplicate Vendor record for the same business.
//
// This is a read-then-write check, not a database constraint: two adds of
// the same place fired inside one round trip can still both pass it. Base44
// has no unique-index facility to enforce it properly, and the realistic
// failure it does close (a stale mount, a second tab, onboarding then
// marketplace) is a slow one, not a race.
//
// @returns {Promise<{record: object, created: boolean}>} `created` is false
//   when an existing record was found and returned instead of writing.
export async function saveVendorFromPlaces(vendor, details) {
  const placeId = vendor.placeId || null;

  if (placeId) {
    const existing = await findMyVendorByPlaceId(placeId);
    if (existing) return { record: existing, created: false };
  }

  const record = await base44.entities.Vendor.create({
    name: vendor.name,
    category: schemaCategory(vendor.category),
    website: details?.website || vendor.website || '',
    phone: details?.phone || vendor.phone || '',
    address: details?.address || vendor.location || '',
    google_place_id: placeId,
    google_rating: details?.rating ?? vendor.rating ?? null,
    google_reviews_count: details?.user_ratings_total ?? vendor.reviewCount ?? null,
    status: 'researching',
  });
  return { record, created: true };
}
