import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyWeddingDetails, getMyGuestsWithRsvp, putMyWeddingDetails } from '@/lib/resolveMyWedding';
import { createMyWeddingDetails } from '@/lib/createMyWeddingDetails';
import useLoad from './useLoad';

/**
 * Everything the Plan hub's live stats need, loaded once, each part
 * failing soft to [] so one slow entity never blanks the hub. The same
 * loaders the desktop pages use.
 */
export function usePlanData() {
  return useLoad(async () => {
    const soft = (p) => p.catch(() => []);
    const [details, guests, tasks, budget, schedule, vendors, messages, registryItems, registryProducts, customGifts, gifts, music, songRequests, vows, moodboard, tables, guestbook] = await Promise.all([
      getMyWeddingDetails().catch(() => null),
      soft(getMyGuestsWithRsvp('created_date')),
      soft(getMyRecords('Note', '-created_date')),
      soft(getMyRecords('Budget', '-created_date')),
      soft(getMyRecords('Schedule', 'start_time')),
      soft(getMyRecords('Vendor', '-created_date')),
      soft(getMyRecords('GuestMessage', '-created_date')),
      soft(getMyRecords('RegistryItem', '-created_date')),
      soft(getMyRecords('RegistryProduct', '-created_date')),
      soft(getMyRecords('CustomGift', '-created_date')),
      soft(getMyRecords('ReceivedGift', '-created_date')),
      soft(getMyRecords('Music', '-created_date')),
      fetchSongRequests(),
      soft(getMyRecords('VowSpeech', '-created_date')),
      soft(getMyRecords('MoodboardItem', '-created_date')),
      soft(getMyRecords('Table', '-created_date')),
      soft(getMyRecords('GuestbookEntry', '-created_date')),
    ]);
    return { details, guests, tasks: tasks.filter((t) => t.view_type === 'todo'), budget, schedule, vendors, messages, registryItems, registryProducts, customGifts, gifts, music, songRequests, vows, moodboard, tables, guestbook };
  }, []);
}

export async function fetchSongRequests() {
  try {
    const token = localStorage.getItem('base44_access_token');
    const res = await fetch('/api/song-request-review', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const { requests } = await res.json();
    return requests || [];
  } catch { return []; }
}

/** POST { songRequestId, action } as Music.jsx does. action: 'add' | 'decline' */
export async function reviewSongRequest(songRequestId, action) {
  const token = localStorage.getItem('base44_access_token');
  const res = await fetch('/api/song-request-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ songRequestId, action }) });
  if (!res.ok) throw new Error('Could not update that request.');
  return res.json().catch(() => ({}));
}

/** A generic entity list with the same create/update/delete the desktop pages call. */
export function useEntity(name, sort = '-created_date') {
  const load = useLoad(() => getMyRecords(name, sort), [name, sort]);
  const E = base44.entities[name];
  const writes = {
    create: async (fields) => { const r = await E.create(fields); load.reload(); return r; },
    update: async (id, fields) => { const r = await E.update(id, fields); load.reload(); return r; },
    remove: async (id) => { await E.delete(id); load.reload(); },
  };
  return { ...load, ...writes };
}

/**
 * The WeddingDetails record, with a saver that follows the desktop pages:
 * plaintext keys through WeddingDetails.update (creating the record first
 * if the couple has none, as WeddingParty.jsx does), encrypted keys
 * (celebrant, license, emergencyContacts, budget, dayVendorContacts,
 * contactPerson) through /api/my-wedding-details PUT.
 */
export function useWeddingDetails() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idRef = useRef(null);
  const load = useCallback(async () => {
    try {
      const d = await getMyWeddingDetails();
      idRef.current = d?.id || null;
      setDetails(d || {});
      setError(null);
    } catch (e) { setError(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (key, value, encrypted) => {
    const patch = key == null ? value : { [key]: value };
    if (encrypted) {
      const id = await putMyWeddingDetails(patch);
      if (!idRef.current) idRef.current = id;
    } else if (idRef.current) {
      await base44.entities.WeddingDetails.update(idRef.current, patch);
    } else {
      const created = await createMyWeddingDetails(patch);
      idRef.current = created.id;
    }
    setDetails((d) => ({ ...(d || {}), ...patch }));
  }, []);

  return { details, loading, error, reload: load, save, id: idRef.current };
}
