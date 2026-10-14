/**
 * api/_lib/professionalCoupleRead.js
 *
 * READING A LINKED COUPLE'S GUESTS, THROUGH THE MODULES THAT ALREADY DO IT.
 * goals/2026-10-14-professional.md, item 0: "the linked feed reuses them
 * rather than re-reading raw rows".
 *
 * Called only by api/professional/feed.js, and only after it has proved a
 * live PlannerLink whose approval the couple made with their own account.
 * Reads exactly what my-guests-rsvp and collaborator-guests read (Guest by
 * the couple's created_by_id, their newest WeddingDetails, RsvpResponse by
 * wedding_id), decrypts through mergeGuestPii, derives replies through
 * overlayStatusForGuest and rsvpAggregation, and hands plain rows to the
 * allowlist in professionalFeed.js. Nothing from here leaves the server
 * except through that allowlist.
 *
 * Tables: Table has owner-scoped read, so the admin key cannot see it. The
 * guest's table comes from Guest.table_assignment, the seating page's own
 * reception cache. Seat numbers would need the hosted asServiceRole read;
 * that is the owner's call, recorded in goals/2026-10-14-professional-item0.md.
 */
import { mergeGuestPii } from './guestPii.js';
import { hashId } from './questionnaireCrypto.js';
import { excludeTestRecords } from './productData.js';
import { overlayStatusForGuest } from '../my-guests-rsvp.js';
import { latestEventResponses } from '../../src/lib/rsvpAggregation.js';
import { effectiveMealChoice, mealOptionLabel } from '../../src/lib/weddingEvents.js';

const BASE = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

async function adminGet(path, adminKey) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${adminKey}` } });
  if (!res.ok) { const e = new Error(`base44 ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return Array.isArray(j) ? j : j?.items || j?.data || [];
}
const q = (o) => encodeURIComponent(JSON.stringify(o));

export async function readCouple(coupleUserId, adminKey = process.env.BASE44_ADMIN_KEY) {
  const [guestsRaw, weddings] = await Promise.all([
    adminGet(`/apps/${APP_ID}/entities/Guest?q=${q({ created_by_id: coupleUserId })}`, adminKey),
    adminGet(`/apps/${APP_ID}/entities/WeddingDetails?q=${q({ created_by_id: coupleUserId })}`, adminKey),
  ]);
  // Ownership re-checked per row, never trusted to the query filter.
  const guests = excludeTestRecords(guestsRaw.filter((g) => g.created_by_id === coupleUserId)).map(mergeGuestPii);
  const wedding = excludeTestRecords(weddings.filter((w) => w.created_by_id === coupleUserId))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  const rsvpRows = wedding ? excludeTestRecords(await adminGet(`/apps/${APP_ID}/entities/RsvpResponse?q=${q({ wedding_id: wedding.id })}`, adminKey)) : [];
  return { guests, wedding, rsvpRows };
}

/** Plain rows for the allowlist: one per guest, the reply derived the way the couple's own pages derive it. */
export function toFeedGuests({ guests, wedding, rsvpRows }) {
  const byHash = new Map();
  for (const r of latestEventResponses(rsvpRows || [])) byHash.set(r.guest_id_hash, [...(byHash.get(r.guest_id_hash) || []), r]);
  const mealOptions = wedding?.mealOptions || wedding?.menuItems || null;
  return (guests || []).map((g) => {
    const { eventResponses, rsvp_status } = overlayStatusForGuest(g, byHash.get(hashId(g.id)));
    return {
      name: g.name,
      rsvp_status,
      plus_one: g.plus_one === true,
      plus_one_name: g.plus_one_name,
      is_child: g.is_child === true,
      dietary_restrictions: g.dietary_restrictions,
      special_requests: g.special_requests,
      meal_label: mealOptionLabel(effectiveMealChoice(eventResponses, g.meal_choice), mealOptions),
      table_assignment: g.table_assignment,
    };
  });
}
