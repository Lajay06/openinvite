/**
 * Inserts Cloudinary auto-format/auto-quality + a width cap into an existing
 * res.cloudinary.com upload URL. Sensible default cap for full-bleed photo
 * blocks — large enough for desktop hero-width backgrounds without shipping
 * full-resolution originals.
 */
export function cloudinaryUrl(baseUrl, width = 1600) {
  return baseUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
