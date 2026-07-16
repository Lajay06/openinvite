/**
 * Central photo library — legacy Wix-hosted images.
 *
 * Trimmed during the marketing-site overhaul (Cloudinary migration): of the
 * 36 keys this file used to export, only these 4 were still referenced
 * anywhere. The other 32 were dead — most sections that used to read from
 * here now use direct Cloudinary URLs instead. Still-open sections backed
 * by this file (FeatureTimeline/FeaturePlaylists/FeatureGuests/FeatureBudget,
 * HeroCollage, TryItSection) were out of scope for this pass — none of the
 * 9 numbered overhaul tasks touched them — and are candidates for a future
 * full Cloudinary migration.
 */

const PHOTOS = {
  // TryItSection.jsx background
  photoJ: "https://static.wixstatic.com/media/d2df22_b014095a4e4f42a9a415f314cad6b260~mv2.jpg",

  // Features.jsx — Quick Start section
  photoM: "https://static.wixstatic.com/media/d2df22_2d4ea077497f48679138b2e04dbc7e3a~mv2.jpg",

  // Features.jsx — Dashboard section
  photoN: "https://static.wixstatic.com/media/d2df22_f936e32d99904a6cbdfe46282fe4b39b~mv2.jpg",

  // Features.jsx — Ava/Essentials full-bleed background
  photoO: "https://static.wixstatic.com/media/d2df22_9be952c6ade04b5cb84818743f98684d~mv2.jpg",
};

export { PHOTOS };