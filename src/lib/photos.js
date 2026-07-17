/**
 * Central photo library — legacy Wix-hosted images.
 *
 * Trimmed during the marketing-site overhaul (Cloudinary migration), then
 * trimmed further in round 3: photoM (Features.jsx's Quick Start section)
 * turned out to be the exact same photo as FeatureBudget.jsx's cocktail-
 * glass image — a real duplicate the image-repeat audit missed because it
 * only matches literal URL strings, not `PHOTOS.key` references. Quick
 * Start now uses its own Cloudinary photo directly; photoM is gone.
 * photoO (Features.jsx's old Ava/Essentials background) was removed the
 * same round when that section dropped its background photo entirely.
 * photoJ went with it: its only consumer, TryItSection.jsx, was dead code
 * (not imported anywhere) — deleted rather than kept as an unrendered
 * duplicate of FeatureGuests.jsx's photo.
 */

const PHOTOS = {
  // Features.jsx — Dashboard section
  photoN: "https://static.wixstatic.com/media/d2df22_f936e32d99904a6cbdfe46282fe4b39b~mv2.jpg",
};

export { PHOTOS };