/**
 * src/lib/musicRows.js — the couple's songs and their guests' requests, in one list.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 12: "Rebuild as a table like every other table in the
 * product: song, artist, tag (ceremony, reception, first dance, or the
 * couple's own), notes. … Guest requests appear in the same table with Approve
 * and Decline."
 *
 * ── THE FINDING THAT MADE THIS URGENT ──────────────────────────────────────
 *
 * Music.jsx already had the whole track CRUD layer — addTrackMutation,
 * updateTrackMutation, deleteTrackMutation, an approve toggle, and a
 * `playlistTracks` query over the Music entity — and the Playlist tab rendered
 * NONE of it. `playlistTracks` was read once, for a count in the stat strip.
 *
 * So a couple's songs were real records, created by approving a guest request,
 * and there was no screen in the product on which they could be seen, retagged
 * or removed. The rebuild is not only a nicer shape; it is the first time the
 * data has a surface.
 *
 * ── ONE LIST, TWO KINDS, AND THE DIFFERENCE IS VISIBLE ─────────────────────
 *
 * A request is not a track. It is somebody's suggestion, it is waiting on an
 * answer, and the row carries who asked and what they said. Merging them into
 * one table is what the ruling asks for; flattening the distinction is not, so
 * every row says which kind it is and only requests carry Approve and Decline.
 */

/** The six tags the Music entity's category enum declares, in the order a day runs. */
export const TAG_ORDER = ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general'];

export const TAG_LABEL = {
  ceremony: 'Ceremony',
  cocktail_hour: 'Cocktail hour',
  dinner: 'Dinner',
  dancing: 'Dancing',
  special_moments: 'Special moments',
  general: 'General',
};

/** Where a row came from, for the column that says so. */
export const KIND_LABEL = { track: 'Your playlist', request: 'Guest request' };

/**
 * A guest request's status, as the table prints it. `pending` is the only one
 * that can be acted on; the rest are history the couple can still read.
 */
export const STATUS_LABEL = {
  pending: 'Waiting on you',
  approved: 'Approved',
  added: 'Added',
  declined: 'Declined',
};

/**
 * THE TAG A ROW ACTUALLY SHOWS — the enum value, or the couple's own words.
 *
 * `category` is a fixed six-value enum, so "the couple's own" could never live
 * in it; `categoryOther` was declared beside it on 2026-09-25 for exactly that.
 * EXACTLY ONE IS EVER SET: choosing a declared category clears the other, and
 * setting the other clears the category. Both set is a state nothing writes,
 * and if a row ever arrives that way the declared category wins — it is the one
 * the schema can validate.
 */
export function resolveTag(track) {
  const t = track && typeof track === 'object' ? track : {};
  const category = typeof t.category === 'string' ? t.category.trim() : '';
  if (category) return { tag: category, label: TAG_LABEL[category] || category, isOwn: false };
  const own = typeof t.categoryOther === 'string' ? t.categoryOther.trim() : '';
  if (own) return { tag: own, label: own, isOwn: true };
  return { tag: '', label: '', isOwn: false };
}

/** Which playlist a track belongs to. A name, or nothing. */
export function resolvePlaylist(track) {
  const t = track && typeof track === 'object' ? track : {};
  return typeof t.playlist === 'string' ? t.playlist.trim() : '';
}

/**
 * The playlist names a couple has made, from WeddingDetails.music.playlists[].
 *
 * THE NAMES LIVE ON THE WEDDING; THE MEMBERSHIP LIVES ON THE TRACK. A playlist
 * is not an entity — it is a string on the tracks that belong to it — so this
 * list is the vocabulary and Music.playlist is the assignment. A track whose
 * playlist is not in this list is orphaned, which is why assignment is a select
 * over these names rather than free text.
 */
export function playlistNames(details) {
  const rows = details?.music?.playlists;
  if (!Array.isArray(rows)) return [];
  return [...new Set(rows.map((p) => (typeof p === 'string' ? p : p?.name))
    .filter((n) => typeof n === 'string' && n.trim())
    .map((n) => n.trim()))];
}

/** A track row. */
function trackRow(t) {
  const { tag, label, isOwn } = resolveTag(t);
  return {
    id: `track-${t.id}`,
    sourceId: t.id,
    kind: 'track',
    song: t.song_title || '',
    artist: t.artist || '',
    tag,
    tagLabel: label,
    tagIsOwn: isOwn,
    playlist: resolvePlaylist(t),
    notes: t.notes || '',
    // A track created from a guest's request keeps the fact in view: it is the
    // couple's now, but they did not choose it out of nowhere.
    askedBy: t.guest_suggestion ? (t.added_by || '') : '',
    status: '',
    raw: t,
  };
}

/** A request row. */
function requestRow(r) {
  return {
    id: `request-${r.id}`,
    sourceId: r.id,
    kind: 'request',
    song: r.title || '',
    artist: r.artist || '',
    tag: '',
    tagLabel: '',
    tagIsOwn: false,
    // A REQUEST IS NOT IN A PLAYLIST YET. It becomes a track when the couple
    // approves it, and that is when it can be assigned one.
    playlist: '',
    notes: r.guestNote || '',
    askedBy: r.submittedBy || '',
    status: r.status || 'pending',
    raw: r,
  };
}

/**
 * Both kinds, in one list.
 *
 * WAITING FIRST. A request nobody has answered is the only row on this page
 * that is asking the couple for something, so it sorts above everything else
 * regardless of tag or title. After that the order is the day's — ceremony
 * before dancing — and then the song, so the list is stable between renders.
 */
export function buildMusicRows({ tracks = [], requests = [] } = {}) {
  const rows = [...tracks.map(trackRow), ...requests.map(requestRow)];
  const rank = (r) => {
    if (r.kind === 'request' && r.status === 'pending') return -1;
    const i = TAG_ORDER.indexOf(r.tag);
    return i === -1 ? TAG_ORDER.length : i;
  };
  return rows.sort((a, b) =>
    rank(a) - rank(b)
    || (a.song || '').localeCompare(b.song || '')
    || (a.artist || '').localeCompare(b.artist || ''));
}

/** Only a request that nobody has answered can be approved or declined. */
export function isActionable(row) {
  return row.kind === 'request' && (row.status || 'pending') === 'pending';
}
