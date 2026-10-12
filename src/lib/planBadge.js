/**
 * src/lib/planBadge.js
 *
 * The plan badge's colors and labels, shared by the PlanBadge component and
 * the gift emails (which are HTML and cannot render a component). Ultra is
 * the dashboard's existing yellow gradient; Pro is the brand pink, the
 * owner's ruling of 2026-10-11.
 */
export const PLAN_BADGE_BACKGROUND = {
  ultra: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
  pro: '#E03553',
};
export const PLAN_BADGE_LABEL = { ultra: 'Ultra', pro: 'Pro' };

/**
 * The badge as an image, for the gift emails (item 2): rendered from the
 * values above by scripts/gift-assets/plan-badges.mjs at 3x and uploaded to a
 * path of its own, overwrite off. Width and height are the CSS size it is
 * drawn at; the file is three times that.
 */
export const PLAN_BADGE_EMAIL_IMAGE = {
  ultra: { url: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1791717886/email-assets/plan-badge-ultra/3x-20261011112445.png', width: 41, height: 19 },
  pro: { url: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1791717886/email-assets/plan-badge-pro/3x-20261011112446.png', width: 33, height: 19 },
};
