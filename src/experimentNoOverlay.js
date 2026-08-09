/**
 * EXPERIMENT ONLY — DO NOT MERGE.
 *
 * One switch that forces every marketing hero overlay and end-cap scrim to
 * zero so the owner can see every photo at full brightness on a preview.
 *
 * Deliberately additive: no measured scrim value and no measurement comment is
 * deleted anywhere. Those numbers are records (#324/#334/#356/#366) and we may
 * be restoring them. Flip this to false and the site is byte-identical to main.
 */
export const EXPERIMENT_NO_OVERLAY = true;
