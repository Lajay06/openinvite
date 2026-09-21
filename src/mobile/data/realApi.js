/**
 * The signed-in implementation of the mobile data seam (see api.js). Every
 * method delegates to the helper the matching desktop page already calls,
 * so the app writes the same fields through the same paths.
 */
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyWeddingDetails, getMyGuestsWithRsvp, putMyWeddingDetails, getMyInvitation } from '@/lib/resolveMyWedding';
import { createMyWeddingDetails } from '@/lib/createMyWeddingDetails';
import { createGuest, updateGuest, deleteGuest } from '@/lib/guestWrites';
import { getWeddingEvents, defaultEventResponses } from '@/lib/weddingEvents';
import { assignGuestToTableByName, unassignGuestFromTables, assignGuestToSeat, unassignSeat, applyEventSeatingPlan, propagateTableRename } from '@/lib/tableAssignment';
import { saveVendorFromPlaces, getSavedPlaceIds } from '@/lib/vendorPlaces';
import { fetchGuestLinks } from '@/lib/guestLinks';
import { syncWeddingAddress } from '@/lib/weddingAddress';
import { InvokeLLM, UploadFile } from '@/integrations/Core';
import { setPin, unlock, clearPin } from '@/lib/vowPinLock';
import { authHeaders } from './api';

async function json(path, init = {}) {
  const res = await fetch(path, { ...init, headers: authHeaders(init.headers || {}) });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) {
    const err = new Error(body?.error || body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body || {};
}

/** Builds the api for the signed-in user. `user` comes from AuthContext. */
export function createRealApi(user) {
  let weddingId = null;
  return {
    mode: 'real',
    user,
    list: (entity, sort) => getMyRecords(entity, sort),
    filter: (entity, query, sort) => base44.entities[entity].filter(query, sort),
    create: (entity, fields) => base44.entities[entity].create(fields),
    update: (entity, id, fields) => base44.entities[entity].update(id, fields),
    remove: (entity, id) => base44.entities[entity].delete(id),
    guests: {
      list: () => getMyGuestsWithRsvp('created_date'),
      /** New guests default to invited for the main events, as Guests.jsx's handleSubmit does. */
      create: (fields, details) => createGuest(fields.event_responses ? fields : { ...fields, event_responses: defaultEventResponses(getWeddingEvents(details)) }),
      update: (id, fields) => updateGuest(id, fields),
      remove: (id) => deleteGuest(id),
    },
    wedding: {
      get: async () => { const d = await getMyWeddingDetails(); weddingId = d?.id || weddingId; return d; },
      invitation: () => getMyInvitation(),
      /**
       * Plaintext keys through WeddingDetails.update (creating the record
       * first when the couple has none, as WeddingParty.jsx does); encrypted
       * keys (celebrant, license, emergencyContacts, budget, dayVendorContacts,
       * contactPerson) through /api/my-wedding-details PUT.
       */
      save: async (key, value, encrypted) => {
        const patch = key == null ? value : { [key]: value };
        if (encrypted) {
          const id = await putMyWeddingDetails(patch);
          if (!weddingId) weddingId = id;
        } else if (weddingId) {
          await base44.entities.WeddingDetails.update(weddingId, patch);
        } else {
          const created = await createMyWeddingDetails(patch);
          weddingId = created.id;
        }
        // The address follows the names until the first invitation exists (EventDetails.jsx).
        if (key == null && ('couple1Name' in value || 'couple2Name' in value) && weddingId) syncWeddingAddress(weddingId);
        return weddingId;
      },
      id: () => weddingId,
    },
    json,
    places: {
      search: (body) => json('/api/places-search', { method: 'POST', body: JSON.stringify(body) }).then((d) => d.places || []),
      details: (placeId) => json(`/api/place-details?place_id=${encodeURIComponent(placeId)}`).then((d) => d.place || null),
      photo: (ref, w = 600) => (ref ? `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}` : null),
    },
    songRequests: {
      list: () => json('/api/song-request-review').then((d) => d.requests || []).catch(() => []),
      review: (songRequestId, action) => json('/api/song-request-review', { method: 'POST', body: JSON.stringify({ songRequestId, action }) }),
    },
    guestLinks: (ids, opts) => fetchGuestLinks(ids, opts),
    seating: {
      assignByName: (args) => assignGuestToTableByName(args),
      unassign: (args) => unassignGuestFromTables(args),
      assignSeat: (args) => assignGuestToSeat(args),
      unassignSeat: (args) => unassignSeat(args),
      applyPlan: (args) => applyEventSeatingPlan(args),
      rename: (args) => propagateTableRename(args),
    },
    vendors: {
      saveFromPlaces: (vendor, details) => saveVendorFromPlaces(vendor, details),
      savedPlaceIds: () => getSavedPlaceIds(),
    },
    vows: { setPin, unlock, clearPin },
    llm: (prompt, opts = {}) => InvokeLLM({ prompt, add_context_from_internet: false, ...opts }),
    upload: (file) => UploadFile({ file }),
    updateMe: (patch) => base44.auth.updateMe(patch),
    /** StudioShareTab.jsx's Email your guests: one SendEmail per guest through the SDK integration. */
    sendEmail: ({ to, subject, body }) => base44.integrations.Core.SendEmail({ to, subject, body }),
  };
}
