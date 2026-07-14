/**
 * entranceConfig.js — feat/entrance-moment
 *
 * One entrance SYSTEM (EntranceMoment.jsx), per-universe CONFIG — the same
 * pattern already established for typography/palette/motion/copy: a plain
 * data object per universe, resolved with a safe default fallback so a
 * universe with no bespoke entry still gets a complete, sensible entrance.
 *
 * Bespoke treatment (explicitly tuned per the brief): aman, marrakech,
 * brooklyn, bali, kyoto.
 * Everyone else (tulum, capri, mykonos, paris, capetown) gets
 * DEFAULT_ENTRANCE_CONFIG — the locked base concept ("names rise up"),
 * still rendered in that universe's own fonts/colours via EntranceMoment,
 * just without a bespoke nameMotion/timing personality yet.
 *
 * All `beats` are ms offsets from mount, not percentages — easier to reason
 * about and tune per universe than a shared percentage scale would be.
 *   scrim  — warm-dark screen + small light appear (~always fast, <500ms)
 *   kicker — kicker line + hairline fade in
 *   names  — couple's names begin their nameMotion
 *   settle — names are done moving; from here the overlay starts lifting
 *            (subject to the hold-for-hero-media logic in EntranceMoment)
 * `totalDuration` is the scripted length with hero media already loaded;
 * EntranceMoment may extend the hold past `settle` up to MAX_HOLD_MS if a
 * photo hero isn't loaded yet, but never past MAX_HOLD_MS total.
 */

export const MAX_HOLD_MS = 4000;

// How the couple's names actually move — five distinct qualitative
// characters, referenced by config.nameMotion and interpreted in
// EntranceMoment.jsx's animation variants.
export const NAME_MOTIONS = ['rise', 'dissolve', 'unfold', 'snap', 'drift', 'stillness'];

export const ENTRANCE_CONFIGS = {
  aman: {
    character: 'reverent-dissolve',
    totalDuration: 3000,
    beats: { scrim: 0, kicker: 500, names: 1300, settle: 2200 },
    nameMotion: 'dissolve',
    ease: [0.4, 0, 0.2, 1],
    glow: false,
  },
  marrakech: {
    character: 'zellige-unfold',
    totalDuration: 2700,
    beats: { scrim: 0, kicker: 400, names: 1100, settle: 2000 },
    nameMotion: 'unfold',
    ease: [0.34, 1.15, 0.64, 1],
    glow: true, // warm lantern glow pulses behind the names as they unfold
  },
  brooklyn: {
    character: 'quick-snap',
    totalDuration: 1800,
    beats: { scrim: 0, kicker: 150, names: 500, settle: 1200 },
    nameMotion: 'snap',
    ease: 'circOut',
    glow: false,
  },
  bali: {
    character: 'soft-drift',
    totalDuration: 2800,
    beats: { scrim: 0, kicker: 450, names: 1200, settle: 2100 },
    nameMotion: 'drift',
    ease: 'easeInOut',
    glow: false,
  },
  kyoto: {
    character: 'stillness-then-names',
    totalDuration: 3000,
    // Deliberately the longest gap between kicker and names of all 10 —
    // "stillness, then names": the pause itself is the gesture.
    beats: { scrim: 0, kicker: 600, names: 1800, settle: 2500 },
    nameMotion: 'stillness',
    ease: [0.16, 1, 0.3, 1],
    glow: false,
  },
};

export const DEFAULT_ENTRANCE_CONFIG = {
  character: 'default-rise',
  totalDuration: 2500,
  beats: { scrim: 0, kicker: 400, names: 1100, settle: 1900 },
  nameMotion: 'rise',
  ease: 'easeOut',
  glow: false,
};

export const BESPOKE_ENTRANCE_UNIVERSES = Object.keys(ENTRANCE_CONFIGS);

export function getEntranceConfig(universeKey) {
  return ENTRANCE_CONFIGS[universeKey] || DEFAULT_ENTRANCE_CONFIG;
}
