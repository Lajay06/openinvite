/**
 * src/components/shared/PlanBadge.jsx
 *
 * THE DASHBOARD'S PLAN BADGE, IN ONE PLACE. The sidebar drew the Ultra badge
 * inline twice (its Guest Suite group label and each locked item), and
 * gifting v2 needs the same badge wherever Pro or Ultra is named (owner
 * ruling 2026-10-11), so it is lifted here and the sidebar consumes it
 * byte for byte: same gradient, same 8px weight-800 type, same padding, same
 * 3px corners.
 *
 * Pro had no badge anywhere in the product; the owner ruled it the brand pink
 * #E03553 in the same shape. The colors live in src/lib/planBadge.js so the
 * gift email, which is HTML and cannot render this component, uses the same
 * values.
 */
import { PLAN_BADGE_BACKGROUND, PLAN_BADGE_LABEL } from '@/lib/planBadge';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * @param {{ plan?: 'ultra'|'pro', padding?: string, fontSize?: number }} props
 *   `padding` and `fontSize` default to the sidebar item's own; the sidebar's
 *   group label passes its tighter "1px 4px". Larger contexts (the gift
 *   flow's cards and summary) pass a larger size in the same shape.
 */
export default function PlanBadge({ plan = 'ultra', padding = '2px 5px', fontSize = 8 }) {
  return (
    <span style={{
      fontSize, fontWeight: 800, background: PLAN_BADGE_BACKGROUND[plan] || PLAN_BADGE_BACKGROUND.ultra,
      color: "#FFFFFF", padding, borderRadius: 3, flexShrink: 0,
      fontFamily: PJS,
    }}>
      {PLAN_BADGE_LABEL[plan] || PLAN_BADGE_LABEL.ultra}
    </span>
  );
}
