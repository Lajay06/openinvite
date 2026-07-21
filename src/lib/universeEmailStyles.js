/**
 * src/lib/universeEmailStyles.js
 *
 * Translates each universe's own UNIVERSE_CONFIGS entry into an email-safe
 * style: background tint, accent colour, headline font stack, divider
 * style. feat/universes-expansion-10: this used to be a hand-maintained
 * duplicate object that had drifted badly out of sync with the real
 * roster — it still had 'tokyo' and 'santorini' (ids that don't exist in
 * UNIVERSE_CONFIGS any more) and was missing brooklyn/capetown/mykonos
 * entirely, so those three silently fell back to London's email styling.
 * Now every value is computed from UNIVERSE_CATALOG (universeCatalog.js),
 * so a universe's email styling can never drift from its real theme, and a
 * new universe gets correct styling the moment it's added to config —
 * nothing to remember to update here.
 *
 * Email-safety choices, applied uniformly:
 *   - No @font-face/web font loading anywhere — every fontDisplay stack
 *     names the universe's real heading font first (renders in the small
 *     number of clients that do support it, e.g. Apple Mail) then falls
 *     back to a universally-installed serif/sans-serif, so nothing is
 *     "required".
 *   - bgTint always uses the universe's own `colors.lightBg`, never
 *     `darkBg` — every universe already defines both, so this sidesteps
 *     the old special-casing (a fully dark email body risks Outlook/Gmail
 *     dark-mode auto-inversion turning inline styles into an unreadable
 *     mess) without needing a hand-maintained "which universes are dark"
 *     exception list.
 */
import { UNIVERSE_CATALOG } from './universeCatalog.js';

const SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function fontDisplayStack(headingFont) {
  const bareName = (headingFont || '').split(',')[0].replace(/"/g, '').trim() || 'Georgia';
  const isSansSerif = /sans-serif\s*$/i.test(headingFont || '');
  return isSansSerif ? `'${bareName}', ${SANS_FALLBACK}` : `'${bareName}', Georgia, 'Times New Roman', serif`;
}

function fontBodyStack() {
  return `'Plus Jakarta Sans', ${SANS_FALLBACK}`;
}

// A small, deliberate heuristic (not a per-universe hand-authored list) —
// most universes stay 'hairline' (matches the quiet, restrained baseline
// most of these worlds share); a few tag families read better with a
// bolder or more textured divider in an email context.
function dividerStyleFor(tags = []) {
  if (tags.some(t => ['urban', 'glamour', 'ornamental', 'fashion'].includes(t))) return 'bold';
  if (tags.some(t => ['tropical', 'desert', 'natural', 'retro'].includes(t))) return 'dotted';
  return 'hairline';
}

export const UNIVERSE_EMAIL_STYLES = Object.fromEntries(
  UNIVERSE_CATALOG.map(u => [u.id, {
    id: u.id,
    name: u.name,
    tagline: u.tagline,
    bgTint: u.colors.lightBg,
    cardBg: '#FFFFFF',
    textColor: u.colors.lightText,
    accent: u.colors.accent,
    fontDisplay: fontDisplayStack(u.typography.headingFont),
    fontBody: fontBodyStack(),
    divider: dividerStyleFor(u.tags),
  }])
);

const DEFAULT_UNIVERSE_ID = 'london';

export function getUniverseEmailStyle(universeId) {
  return UNIVERSE_EMAIL_STYLES[universeId] || UNIVERSE_EMAIL_STYLES[DEFAULT_UNIVERSE_ID];
}
