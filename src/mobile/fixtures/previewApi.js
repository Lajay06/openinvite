/**
 * The preview and demo implementation of the mobile data seam (data/api.js).
 * Everything lives in memory, seeded from the fixtures, and nothing here
 * ever calls fetch: the same containers that drive the signed-in app run
 * against this object under /m/preview and in the demo build.
 *
 * `?state=loading|empty|error` on any preview URL shapes what the reads
 * return, exactly as the old per-screen preview wiring did, so the
 * screenshot script's states still work.
 *
 * Place photos: Google's search returns a `photo_reference`; in the demo the
 * reference is `demo:<slot>` and `places.photo()` resolves it through the
 * image manifest, so demo screens show a photo where the connected app
 * shows Google's. The real api never sees these references.
 */
import { imageUrl } from '../images';
import { RECEPTION_EVENT_ID } from '@/lib/weddingEvents';
import {
  FIXTURE_USER, FIXTURE_WEDDING, FIXTURE_GUESTS, FIXTURE_TASKS, FIXTURE_BUDGET, FIXTURE_SCHEDULE, FIXTURE_VENDORS, FIXTURE_MESSAGES,
  FIXTURE_SONG_REQUESTS, FIXTURE_MUSIC, FIXTURE_POLL_VOTES, FIXTURE_GIFTS, FIXTURE_REGISTRY, FIXTURE_VOWS, FIXTURE_MOODBOARD, FIXTURE_TABLES, FIXTURE_NOTIFICATION_ENTITY,
} from './index';
import { FIXTURE_PLACES, FIXTURE_PLACE_DETAILS, FIXTURE_GAMES, FIXTURE_GAME_RESPONSES, FIXTURE_VENDOR_LOGS, FIXTURE_VENDOR_TASKS, FIXTURE_POLL_COMMENTS, FIXTURE_INVITATION } from './extra';

const clone = (v) => JSON.parse(JSON.stringify(v));
const genId = (p = 'x') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function stateFlag() {
  try { return new URLSearchParams(window.location.search).get('state') || ''; } catch { return ''; }
}

/** Every read goes through here so the three preview states behave the same everywhere. */
async function gate(value, { empty } = {}) {
  const s = stateFlag();
  if (s === 'loading') return new Promise(() => {});
  if (s === 'error') throw new Error('preview');
  if (s === 'empty') return empty;
  return value;
}

const EMPTY_WEDDING = { ...FIXTURE_WEDDING, polls: [], qna: [], weddingParty: {}, weddingPolicies: {}, preWeddingEvents: [], postWeddingEvents: [], guestSuiteAccommodation: { places: [] }, guestSuiteTransport: { places: [], notes: [] }, experienceGuide: {}, budget: null, coverPhoto: '', ourStoryContent: { photos: [] }, websiteEnabled: false, slug: '' };

function seed() {
  return {
    wedding: clone(FIXTURE_WEDDING),
    entities: {
      Guest: clone(FIXTURE_GUESTS),
      Note: clone(FIXTURE_TASKS),
      Budget: clone(FIXTURE_BUDGET),
      Schedule: clone(FIXTURE_SCHEDULE),
      Vendor: clone(FIXTURE_VENDORS),
      GuestMessage: clone(FIXTURE_MESSAGES),
      RegistryItem: clone(FIXTURE_REGISTRY.links),
      RegistryProduct: clone(FIXTURE_REGISTRY.products),
      CustomGift: clone(FIXTURE_REGISTRY.funds),
      ReceivedGift: clone(FIXTURE_GIFTS),
      Music: clone(FIXTURE_MUSIC),
      VowSpeech: clone(FIXTURE_VOWS),
      MoodboardItem: clone(FIXTURE_MOODBOARD),
      Table: clone(FIXTURE_TABLES),
      GuestbookEntry: [],
      PollVote: clone(FIXTURE_POLL_VOTES),
      PollComment: clone(FIXTURE_POLL_COMMENTS),
      Questionnaire: clone(FIXTURE_GAMES),
      VendorLog: clone(FIXTURE_VENDOR_LOGS),
      VendorTask: clone(FIXTURE_VENDOR_TASKS),
      Notification: clone(FIXTURE_NOTIFICATION_ENTITY),
      VenueAsset: [],
      CustomEventPage: [],
      LiveStream: [],
    },
    songRequests: clone(FIXTURE_SONG_REQUESTS),
    gameResponses: clone(FIXTURE_GAME_RESPONSES),
    pins: {},
  };
}

let store = seed();
/** The screenshot script and tests can reset between screens. */
export function resetPreviewStore() { store = seed(); }

const sortBy = (list, sort) => {
  if (!sort) return list;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...list].sort((a, b) => { const x = a[key] ?? ''; const y = b[key] ?? ''; return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); });
};
const listOf = (name) => { if (!store.entities[name]) store.entities[name] = []; return store.entities[name]; };
const matches = (row, q) => Object.entries(q || {}).every(([k, v]) => row[k] === v);

const entity = {
  list: (name, sort) => gate(clone(sortBy(listOf(name), sort)), { empty: [] }),
  filter: (name, q, sort) => gate(clone(sortBy(listOf(name).filter((r) => matches(r, q)), sort)), { empty: [] }),
  create: async (name, fields) => { const row = { id: genId(), created_date: new Date().toISOString(), ...clone(fields) }; listOf(name).unshift(row); return clone(row); },
  update: async (name, id, fields) => { const l = listOf(name); const i = l.findIndex((r) => r.id === id); if (i < 0) throw new Error('Not found'); l[i] = { ...l[i], ...clone(fields) }; return clone(l[i]); },
  remove: async (name, id) => { store.entities[name] = listOf(name).filter((r) => r.id !== id); },
};

/* ── Seating, mirroring src/lib/tableAssignment.js over the in-memory Table list ── */
const tableEvent = (t) => t.event_id || RECEPTION_EVENT_ID;
async function removeFromAll(guestId, eventId) {
  const changed = [];
  for (const t of listOf('Table')) {
    if (tableEvent(t) !== eventId) continue;
    const before = t.assigned_guests || [];
    const after = before.filter((a) => a.guest_id !== guestId);
    if (after.length !== before.length) { t.assigned_guests = after; changed.push(t.id); }
  }
  return changed;
}
const seating = {
  assignByName: async ({ guestId, tableName, eventId = RECEPTION_EVENT_ID }) => {
    const name = (tableName || '').trim();
    await removeFromAll(guestId, eventId);
    let table = listOf('Table').find((t) => tableEvent(t) === eventId && t.name.trim().toLowerCase() === name.toLowerCase());
    let created = false;
    if (!table) { table = await entity.create('Table', { name, shape: 'round', capacity: 8, x: 100, y: 100, assigned_guests: [], event_id: eventId }); table = listOf('Table').find((t) => t.id === table.id); created = true; }
    const used = new Set((table.assigned_guests || []).map((a) => a.seat_index));
    let seat = 0; while (used.has(seat)) seat++;
    table.assigned_guests = [...(table.assigned_guests || []), { guest_id: guestId, seat_index: seat }];
    if (seat >= (table.capacity || 8)) table.capacity = seat + 1;
    if (eventId === RECEPTION_EVENT_ID) await entity.update('Guest', guestId, { table_assignment: table.name }).catch(() => {});
    return { tableId: table.id, tableName: table.name, created, grewCapacityTo: null };
  },
  unassign: async ({ guestId, eventId = RECEPTION_EVENT_ID }) => { const c = await removeFromAll(guestId, eventId); if (c.length && eventId === RECEPTION_EVENT_ID) await entity.update('Guest', guestId, { table_assignment: '' }).catch(() => {}); return c; },
  assignSeat: async ({ guestId, tableId, seatIndex, eventId }) => {
    const table = listOf('Table').find((t) => t.id === tableId);
    if (!table) return { ok: false, reason: 'table-not-found' };
    const scope = eventId || tableEvent(table);
    const conflict = listOf('Table').find((t) => tableEvent(t) === scope && (t.assigned_guests || []).some((a) => a.guest_id === guestId && !(t.id === tableId && a.seat_index === seatIndex)));
    if (conflict) return { ok: false, reason: 'already-seated-in-event', tableName: conflict.name };
    table.assigned_guests = [...(table.assigned_guests || []).filter((a) => a.seat_index !== seatIndex && a.guest_id !== guestId), { guest_id: guestId, seat_index: seatIndex }];
    if (scope === RECEPTION_EVENT_ID && !String(guestId).includes('::')) await entity.update('Guest', guestId, { table_assignment: table.name }).catch(() => {});
    return { ok: true, tableName: table.name };
  },
  unassignSeat: async ({ guestId, tableId, seatIndex, eventId }) => {
    const table = listOf('Table').find((t) => t.id === tableId);
    if (!table) return { ok: false, reason: 'table-not-found' };
    table.assigned_guests = (table.assigned_guests || []).filter((a) => a.seat_index !== seatIndex);
    if (guestId && (eventId || tableEvent(table)) === RECEPTION_EVENT_ID && !String(guestId).includes('::')) await entity.update('Guest', guestId, { table_assignment: '' }).catch(() => {});
    return { ok: true, tableName: table.name };
  },
  applyPlan: async ({ assignments, eventId }) => {
    let ok = 0; let err = 0;
    for (const t of listOf('Table')) if (tableEvent(t) === eventId) t.assigned_guests = [];
    for (const a of assignments || []) {
      const table = listOf('Table').find((t) => t.id === a.tableId);
      if (!table) { err++; continue; }
      table.assigned_guests = (a.guestIds || []).map((id, i) => ({ guest_id: id, seat_index: i }));
      ok += (a.guestIds || []).length;
    }
    return { ok, err };
  },
  rename: async ({ tableId, newName }) => {
    const table = listOf('Table').find((t) => t.id === tableId);
    if (!table || tableEvent(table) !== RECEPTION_EVENT_ID) return [];
    const ids = (table.assigned_guests || []).map((a) => a.guest_id);
    for (const id of ids) await entity.update('Guest', id, { table_assignment: newName }).catch(() => {});
    return ids;
  },
};

/** The /api routes the app calls, answered from the store. */
async function json(path, init = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};
  const url = new URL(path, 'http://preview.local');
  const p = url.pathname;
  await gate(null, { empty: null });
  if (p === '/api/song-request-review' && method === 'GET') return { requests: clone(store.songRequests) };
  if (p === '/api/song-request-review') {
    const r = store.songRequests.find((x) => x.id === body.songRequestId);
    if (!r) throw new Error('Not found');
    r.status = body.action === 'add' ? 'added' : body.action === 'approve' ? 'approved' : 'declined';
    if (body.action === 'add') await entity.create('Music', { song_title: r.title, artist: r.artist, category: 'party', approved: true, guest_suggestion: true, source: 'guest' });
    return { ok: true };
  }
  if (p === '/api/place-details') { const id = url.searchParams.get('place_id'); return { place: clone(FIXTURE_PLACE_DETAILS[id] || FIXTURE_PLACES.find((x) => x.place_id === id) || null) }; }
  if (p === '/api/places-search') {
    const q = String(body.q || '').toLowerCase();
    const hit = FIXTURE_PLACES.filter((x) => !q || x.keywords.some((k) => q.includes(k)));
    return { places: clone((hit.length ? hit : FIXTURE_PLACES).slice(0, 6).map(({ keywords, ...rest }) => rest)) };
  }
  if (p === '/api/send-guest-reply' || p === '/api/send-invites' || p === '/api/contact') return { ok: true, sent: (body.guests || []).length };
  if (p === '/api/questionnaire-responses-for-owner') return { responses: clone(store.gameResponses) };
  if (p === '/api/my-guest-links') return { links: Object.fromEntries((body.guestIds || []).map((id) => [id, { token: `demo-${id}`, rsvpUrl: `https://openinvite.com.au/rsvp/demo-${id}`, plusOneToken: body.includePlusOne ? `demo-${id}-po` : undefined }])) };
  if (p === '/api/vow-pin') {
    const { action, itemId, pin } = body;
    const item = listOf('VowSpeech').find((v) => v.id === itemId);
    if (!item) throw Object.assign(new Error('Not found'), { status: 404 });
    if (action === 'set') { store.pins[itemId] = pin; item.pin_hash = 'demo'; return { ok: true }; }
    if (action === 'clear') { delete store.pins[itemId]; delete item.pin_hash; return { ok: true }; }
    if (action === 'unlock') { if (store.pins[itemId] === pin) return { ok: true, content: item.content }; throw Object.assign(new Error('That PIN is not right.'), { status: 403 }); }
    return { ok: true };
  }
  if (p === '/api/my-wedding-details' && method === 'PUT') { store.wedding[body.field] = body.value; return { id: store.wedding.id }; }
  if (p === '/api/change-address') { store.wedding.previousSlugs = [...(store.wedding.previousSlugs || []), store.wedding.slug]; store.wedding.slug = body.newSlug; return { slug: body.newSlug, previousSlugs: store.wedding.previousSlugs }; }
  if (p === '/api/schedule-feed-url') return { url: 'https://openinvite.com.au/api/schedule-feed?token=demo' };
  if (p === '/api/create-portal-session') return { url: '' };
  return {};
}

export function createPreviewApi() {
  return {
    mode: 'preview',
    user: FIXTURE_USER,
    symbol: 'A$',
    list: entity.list,
    filter: entity.filter,
    create: entity.create,
    update: entity.update,
    remove: entity.remove,
    guests: {
      list: () => entity.list('Guest', 'created_date'),
      create: (fields) => entity.create('Guest', { invite_sent_at: null, rsvp_status: 'pending', ...fields }),
      update: (id, fields) => entity.update('Guest', id, fields),
      remove: (id) => entity.remove('Guest', id),
    },
    wedding: {
      get: () => gate(clone(store.wedding), { empty: clone(EMPTY_WEDDING) }),
      invitation: () => gate(clone(FIXTURE_INVITATION), { empty: null }),
      save: async (key, value) => { if (key == null) Object.assign(store.wedding, clone(value)); else store.wedding[key] = clone(value); return store.wedding.id; },
      id: () => store.wedding.id,
    },
    json,
    places: {
      search: (body) => json('/api/places-search', { method: 'POST', body: JSON.stringify(body) }).then((d) => d.places || []),
      details: (placeId) => json(`/api/place-details?place_id=${encodeURIComponent(placeId)}`).then((d) => d.place || null),
      photo: (ref) => (ref && String(ref).startsWith('demo:') ? imageUrl(String(ref).slice(5)) : null),
    },
    songRequests: {
      list: () => json('/api/song-request-review').then((d) => d.requests || []),
      review: (songRequestId, action) => json('/api/song-request-review', { method: 'POST', body: JSON.stringify({ songRequestId, action }) }),
    },
    guestLinks: (ids, opts = {}) => json('/api/my-guest-links', { method: 'POST', body: JSON.stringify({ guestIds: ids, includePlusOne: !!opts.includePlusOne }) }).then((d) => d.links || {}),
    seating,
    vendors: {
      saveFromPlaces: async (vendor, details) => {
        const existing = listOf('Vendor').find((v) => v.google_place_id === vendor.placeId);
        if (existing) return { record: clone(existing), created: false };
        const record = await entity.create('Vendor', { name: vendor.name, category: 'other', website: details?.website || vendor.website || '', phone: details?.phone || vendor.phone || '', address: details?.address || vendor.location || '', google_place_id: vendor.placeId, google_rating: details?.rating ?? vendor.rating ?? null, google_reviews_count: details?.user_ratings_total ?? vendor.reviewCount ?? null, status: 'researching' });
        return { record, created: true };
      },
      savedPlaceIds: async () => new Set(listOf('Vendor').map((v) => v.google_place_id).filter(Boolean)),
    },
    llm: async (prompt, opts = {}) => {
      await new Promise((r) => setTimeout(r, 600));
      if (opts.response_json_schema) return { assignments: [], unassigned: [], summary: 'Demo mode cannot plan seating; the connected app asks Ava.' };
      if (/thank-you note/i.test(prompt)) return 'Thank you so much for the beautiful casserole. It has already had its first outing on a Sunday, and we thought of you both with every spoonful. With love and gratitude, Priya and Tom.';
      if (/introduction/i.test(prompt)) return 'Byron Bay is where the morning starts on the sand and ends with a long lunch nobody planned. Come for the wedding, stay for the light.';
      if (/vows|speech/i.test(prompt)) return 'Tom, the first thing you ever said to me was a question about parking. I have never once minded answering it since.';
      if (/insight/i.test(prompt)) return 'September is running away with it.';
      return 'Demo mode. The connected app asks Ava here.';
    },
    upload: async () => ({ file_url: imageUrl('fixturePin1') }),
    updateMe: async (patch) => Object.assign(FIXTURE_USER, patch),
  };
}
