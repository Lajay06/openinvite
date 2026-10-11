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
