/**
 * src/lib/universeEmailStyles.js
 *
 * Maps each of the 11 universe themes (Aman + the 10 defined in
 * src/components/studio/*UniverseView.jsx / UNIVERSE_CONFIGS) to an email-safe
 * style: background tint, accent colour, headline font stack, divider style.
 * Values are read directly from each universe's own CONFIG object (bg,
 * primary, accent, fontDisplay) — this file doesn't invent new colours, it
 * translates existing theme tokens into what an HTML email can safely render.
 *
 * Email-safety choices, applied uniformly:
 *   - No @font-face/web font loading anywhere — every fontDisplay/fontBody
 *     stack names the universe's real font first (renders in the small
 *     number of clients that do support it, e.g. Apple Mail) then falls back
 *     to a universally-installed serif/sans-serif, so nothing is "required".
 *   - Aman and Tokyo are the only two universes with a dark CONFIG.bg
 *     (#0A0A0A). A fully dark email body risks Outlook/Gmail dark-mode
 *     auto-inversion turning inline styles into an unreadable mess, so both
 *     get a light, neutral bgTint instead — their identity still comes
 *     through via accent colour, headline font, and divider treatment.
 *     Every other universe's bgTint is its own CONFIG.bg unchanged (already
 *     light).
 */

const SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function fontDisplayStack(name) {
  return `'${name}', Georgia, 'Times New Roman', serif`;
}

function fontBodyStack() {
  return `'Plus Jakarta Sans', ${SANS_FALLBACK}`;
}

export const UNIVERSE_EMAIL_STYLES = {
  aman: {
    id: 'aman', name: 'Aman', tagline: 'Quiet Luxury',
    bgTint: '#F8F7F5', cardBg: '#FFFFFF', textColor: '#0A0A0A',
    accent: '#C4956A',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'hairline', // quiet luxury — barely-there line, matches the universe's own restraint
  },
  tulum: {
    id: 'tulum', name: 'Tulum', tagline: 'Barefoot luxury',
    bgTint: '#F5ECD7', cardBg: '#FFFFFF', textColor: '#3D2B1F',
    accent: '#D4845A',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'dotted', // sun-bleached, organic — dotted reads as texture, not a hard rule
  },
  kyoto: {
    id: 'kyoto', name: 'Kyoto', tagline: 'Zen & ceremony',
    bgTint: '#F5F2ED', cardBg: '#FFFFFF', textColor: '#1A1A1A',
    accent: '#6B6B5A',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'hairline', // ma — negative space, restraint
  },
  capri: {
    id: 'capri', name: 'Capri', tagline: 'Italian coast',
    bgTint: '#FEFBF3', cardBg: '#FFFFFF', textColor: '#1B3A6B',
    accent: '#E8C547',
    fontDisplay: fontDisplayStack('Playfair Display'),
    fontBody: fontBodyStack(),
    divider: 'bold', // joyful luxury — a confident line, not a whisper
  },
  tokyo: {
    id: 'tokyo', name: 'Tokyo', tagline: 'Editorial nightlife',
    bgTint: '#F5F5F5', cardBg: '#FFFFFF', textColor: '#0A0A0A',
    accent: '#B8FF00',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'bold', // neon accent, sharp contrast — matches "editorial nightlife"
  },
  marrakech: {
    id: 'marrakech', name: 'Marrakech', tagline: 'Spice & gold',
    bgTint: '#F2E8D9', cardBg: '#FFFFFF', textColor: '#2C1810',
    accent: '#C9A96E',
    fontDisplay: fontDisplayStack('Playfair Display'),
    fontBody: fontBodyStack(),
    divider: 'dotted', // layered, sensory richness
  },
  paris: {
    id: 'paris', name: 'Paris', tagline: 'Haussmann romance',
    bgTint: '#FAF7F2', cardBg: '#FFFFFF', textColor: '#1A1A2E',
    accent: '#C9A96E',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'hairline', // timeless, understated elegance
  },
  amalfi: {
    id: 'amalfi', name: 'Amalfi', tagline: 'Sun-drenched coast',
    bgTint: '#FEFDF9', cardBg: '#FFFFFF', textColor: '#1B4B6B',
    accent: '#E8A040',
    fontDisplay: fontDisplayStack('Playfair Display'),
    fontBody: fontBodyStack(),
    divider: 'bold', // vibrant, "dream in colour"
  },
  sedona: {
    id: 'sedona', name: 'Sedona', tagline: 'Red rock ritual',
    bgTint: '#F2EAE0', cardBg: '#FFFFFF', textColor: '#3D2415',
    accent: '#C4783A',
    fontDisplay: fontDisplayStack('Playfair Display'),
    fontBody: fontBodyStack(),
    divider: 'dotted', // earthy, ritual, organic
  },
  aspen: {
    id: 'aspen', name: 'Aspen', tagline: 'Black tie winter',
    bgTint: '#F8F8F6', cardBg: '#FFFFFF', textColor: '#1A1A1A',
    accent: '#2D5A27',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'hairline', // black tie formality
  },
  santorini: {
    id: 'santorini', name: 'Santorini', tagline: 'Aegean sculptural',
    bgTint: '#FAFCFF', cardBg: '#FFFFFF', textColor: '#0A2540',
    accent: '#4A90D9',
    fontDisplay: fontDisplayStack('Cormorant Garamond'),
    fontBody: fontBodyStack(),
    divider: 'hairline', // crisp, architectural, whitewashed
  },
};

const DEFAULT_UNIVERSE_ID = 'aman';

export function getUniverseEmailStyle(universeId) {
  return UNIVERSE_EMAIL_STYLES[universeId] || UNIVERSE_EMAIL_STYLES[DEFAULT_UNIVERSE_ID];
}
