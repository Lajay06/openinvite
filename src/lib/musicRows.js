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

/** A track row. */
function trackRow(t) {
  return {
    id: `track-${t.id}`,
    sourceId: t.id,
    kind: 'track',
    song: t.song_title || '',
    artist: t.artist || '',
    tag: t.category || '',
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
