import { createContext, useContext } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

/**
 * The one seam between the mobile screens and where their data comes from.
 *
 * Every container reads and writes through `useApi()`. The real
 * implementation (realApi.js) delegates to the same helpers the desktop
 * pages call: getMyRecords, base44.entities.*, guestWrites, the /api/*
 * endpoints, InvokeLLM and UploadFile. The preview implementation
 * (fixtures/previewApi.js) keeps everything in memory, seeded from the
 * fixtures, and makes no network call at all, so /m/preview and the demo
 * build run the very same containers as the signed-in app.
 *
 * Surface (all async unless noted):
 *   mode                       'real' | 'preview'
 *   user                       the signed-in user (sync)
 *   list(entity, sort)         owner-scoped records
 *   filter(entity, query, sort)
 *   create(entity, fields) / update(entity, id, fields) / remove(entity, id)
 *   guests.list() / guests.create(fields, details) / guests.update(id, f) / guests.remove(id)
 *   wedding.get() / wedding.save(key, value, encrypted) -> id
 *   json(path, init)           an authenticated /api call returning parsed JSON (throws on !ok)
 *   places.search(body) / places.details(placeId) / places.photo(ref, width)
 *   songRequests.list() / songRequests.review(id, action)
 *   guestLinks(ids, opts)
 *   seating.assignByName / unassign / assignSeat / unassignSeat / applyPlan / rename
 *   vendors.saveFromPlaces(vendor, details) / vendors.savedPlaceIds()
 *   vows.setPin(id, pin) / vows.unlock(id, pin) / vows.clearPin(id)   -> { ok, error? }
 *   llm(prompt, opts)          InvokeLLM
 *   contacts()                 the phone's contacts (goal 8): { status, contacts[] }; fixtures in a demo
 *   calendarFeed()             the subscribe URL once the feed answers with a calendar, else null (goal 8)
 *   upload(file)               -> { file_url }
 *   updateMe(patch)
 */
export const ApiContext = createContext(null);

export function useApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi() needs an ApiContext.Provider above it.');
  return api;
}

/** The auth header every /api call carries, as the desktop pages build it. */
export function authHeaders(extra = {}) {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('base44_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

/** The currency symbol: the preview names its own, the real app reads CurrencyContext. */
export function useSymbol() {
  const api = useApi();
  const { symbol } = useCurrency();
  return api.symbol || symbol || '$';
}
