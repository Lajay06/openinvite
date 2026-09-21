import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from './api';
import useLoad from './useLoad';

/**
 * Everything the Plan hub's live stats need, loaded once, each part
 * failing soft to [] so one slow entity never blanks the hub. The same
 * loaders the desktop pages use, through the api seam.
 */
export function usePlanData() {
  const api = useApi();
  return useLoad(async () => {
    // A store that failed is named, not emptied: DailyUpdate.jsx's banner says which numbers are incomplete.
    const failed = [];
    const soft = (p, name) => p.catch(() => { if (name) failed.push(name); return []; });
    const [details, guests, tasks, budget, schedule, vendors, messages, registryItems, registryProducts, customGifts, gifts, music, songRequests, vows, moodboard, tables, guestbook] = await Promise.all([
      api.wedding.get().catch(() => null),
      soft(api.guests.list(), 'guests'),
      soft(api.list('Note', '-created_date'), 'to-dos'),
      soft(api.list('Budget', '-created_date'), 'budget'),
      soft(api.list('Schedule', 'start_time'), 'schedule'),
      soft(api.list('Vendor', '-created_date'), 'vendors'),
      soft(api.list('GuestMessage', '-created_date')),
      soft(api.list('RegistryItem', '-created_date')),
      soft(api.list('RegistryProduct', '-created_date')),
      soft(api.list('CustomGift', '-created_date')),
      soft(api.list('ReceivedGift', '-created_date')),
      soft(api.list('Music', '-created_date')),
      soft(api.songRequests.list()),
      soft(api.list('VowSpeech', '-created_date')),
      soft(api.list('MoodboardItem', '-created_date')),
      soft(api.list('Table', '-created_date')),
      soft(api.list('GuestbookEntry', '-created_date')),
    ]);
    return { details, guests, tasks: tasks.filter((t) => t.view_type === 'todo'), budget, schedule, vendors, messages, registryItems, registryProducts, customGifts, gifts, music, songRequests, vows, moodboard, tables, guestbook, failed };
  }, []);
}

/** A generic entity list with the same create/update/delete the desktop pages call. */
export function useEntity(name, sort = '-created_date') {
  const api = useApi();
  const load = useLoad(() => api.list(name, sort), [name, sort]);
  const writes = useMemo(() => ({
    create: async (fields) => { const r = await api.create(name, fields); load.reload(); return r; },
    update: async (id, fields) => { const r = await api.update(name, id, fields); load.reload(); return r; },
    updateQuiet: (id, fields) => api.update(name, id, fields),
    remove: async (id) => { await api.remove(name, id); load.reload(); },
  }), [api, name, load.reload]);
  return { ...load, ...writes };
}

/** Records filtered by a query (VendorLog and VendorTask by vendor, PollVote by wedding). */
export function useFiltered(name, query, sort) {
  const api = useApi();
  const key = JSON.stringify(query || {});
  const load = useLoad(() => api.filter(name, query || {}, sort), [name, key, sort]);
  const writes = useMemo(() => ({
    create: async (fields) => { const r = await api.create(name, { ...(query || {}), ...fields }); load.reload(); return r; },
    update: async (id, fields) => { const r = await api.update(name, id, fields); load.reload(); return r; },
    remove: async (id) => { await api.remove(name, id); load.reload(); },
  }), [api, name, key, load.reload]);
  return { ...load, ...writes };
}

/**
 * The WeddingDetails record, with a saver that follows the desktop pages:
 * plaintext keys through WeddingDetails.update (creating the record first
 * if the couple has none), encrypted keys (celebrant, license,
 * emergencyContacts, budget, dayVendorContacts, contactPerson) through
 * /api/my-wedding-details PUT. `save(null, patch)` writes top-level fields.
 */
export function useWeddingDetails() {
  const api = useApi();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const load = useCallback(async () => {
    try {
      const d = await api.wedding.get();
      if (!alive.current) return;
      setDetails(d || {});
      setError(null);
    } catch (e) { if (alive.current) setError(e); }
    if (alive.current) setLoading(false);
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (key, value, encrypted) => {
    await api.wedding.save(key, value, encrypted);
    const patch = key == null ? value : { [key]: value };
    setDetails((d) => ({ ...(d || {}), ...patch }));
  }, [api]);

  return { details, loading, error, reload: load, save, id: api.wedding.id() };
}
