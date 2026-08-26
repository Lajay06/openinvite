/**
 * src/lib/coupleNames.js — the client-side door to the one owner.
 *
 * A RE-EXPORT, NOT A SECOND IMPLEMENTATION. Two copies of a rule drift, and
 * this rule decides what a guest sees on an invitation. Same pattern as
 * src/lib/claimSlug.js's canonicalSlug re-export. See api/_lib/coupleNames.js
 * for why the field has an owner at all.
 */
export { coupleDisplayName, coupleNameParts } from '../../api/_lib/coupleNames.js';
