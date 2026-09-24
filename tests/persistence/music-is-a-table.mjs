/**
 * Music is a table, and the couple's own songs finally have a screen.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 12: "Rebuild as a table like every other table in the
 * product: song, artist, tag (ceremony, reception, first dance, or the
 * couple's own), notes. Two actions above it: Create a playlist (the table,
 * named; a couple may have several) and Link a playlist (the existing embed,
 * secondary). Guest requests appear in the same table with Approve and
 * Decline. Existing linked playlists are preserved."
 *
 * ── THE FINDING THAT MADE THIS MORE THAN A RESHAPE ─────────────────────────
 *
 * Music.jsx already had the whole track layer — addTrackMutation,
 * updateTrackMutation, deleteTrackMutation, an approve toggle, and a
 * `playlistTracks` query over the Music entity — and the Playlist tab rendered
 * NONE of it. `playlistTracks` was read exactly once, for a number in the stat
 * strip, and every handler that could add, edit or remove a track was declared
 * and never called: eslint listed handleAddTrack, handleEditTrack,
 * handleUpdateTrack, handleDeleteTrack and handleToggleApproval as unused
 * before this change.
 *
 * So a couple's songs were real records, created by approving a guest request,
 * and there was no screen in the product on which they could be seen, retagged
 * or removed — and no way at all to type in a song of their own. "Build a
 * playlist without any external service" was not possible.
 *
 * ── THE HALF THAT STOPPED ──────────────────────────────────────────────────
 *
 * "Create a playlist (the table, named; a couple may have several)" and the
 * ruling's "or the couple's own" tag both need a SCHEMA CHANGE.
 * base44/entities/Music.jsonc declares `category` as a fixed six-value enum —
 * ceremony, cocktail_hour, dinner, dancing, special_moments, general — and the
 * Music entity has no other field that could name a playlist. A couple's own
 * tag cannot be stored, and a track cannot be assigned to a named playlist.
 *
 * WeddingDetails.music.playlists[] can already hold names (handleAddPlaylist
 * has written them for some time), so the missing half is on the TRACK, not on
 * the wedding. Reported rather than faked into `notes` or written as an enum
 * value the schema does not declare.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGE = strip(read('src/pages/Music.jsx'));
const TABLE = strip(read('src/components/music/MusicTable.jsx'));
const SCHEMA = read('base44/entities/Music.jsonc');

export async function runMusicIsATable() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Music — one table, the couple’s songs and their guests’ requests:\n');

  let lib = {};
  try { lib = await import('../../src/lib/musicRows.js'); } catch { /* reported below */ }
  const build = lib.buildMusicRows;

  // ── The table is the same table ───────────────────────────────────────────
  check('there is a MusicTable', !!TABLE, 'src/components/music/MusicTable.jsx');
  check('  built on the shared table shell, like every other table',
    /from '@\/components\/shared\/DataTable'/.test(TABLE) && /from '@\/components\/shared\/TableToolbar'/.test(TABLE),
    'DataTable + TableToolbar');
  check('  with the shared pills and the shared sorter',
    /from '@\/lib\/tablePills'/.test(TABLE) && /from '@\/lib\/tableSort'/.test(TABLE), 'no bespoke copies');
  for (const col of ['song', 'artist', 'tag', 'notes']) {
    check(`  it has a ${col} column`, new RegExp(`key: '${col}'`).test(TABLE), col);
  }
  check('  and a column saying whether a row is the couple’s or a guest’s',
    /key: 'kind'/.test(TABLE), 'From');

  // ── The page renders it, and no longer hand-rolls a request list ──────────
  check('the page renders the table', /<MusicTable/.test(PAGE), 'MusicTable');
  check('  fed by the tracks query that used to render nothing',
    /tracks=\{playlistTracks\}/.test(PAGE), 'playlistTracks finally has a surface');
  check('  and by the requests, in the same table',
    /requests=\{allRequests\}/.test(PAGE), 'one table, both kinds');
  check('  the hand-rolled request rows are gone',
    !/requestRowStyle/.test(PAGE) && !/REQUEST_TABS/.test(PAGE), 'no second list');

  // ── Approve and Decline, on requests only ─────────────────────────────────
  // IN THE ROW, NOT IN THE MENU. DataTable's row actions sit behind a "···"
  // dropdown, which is right for Edit and Remove — you go looking for those.
  // It is wrong for a request waiting on a decision: the owner's walk-through
  // reported these controls MISSING when they were merely conditional, and a
  // dropdown is one more place for them to be missing from.
  check('requests carry Approve and Decline', />Approve</.test(TABLE) && />Decline</.test(TABLE), 'both');
  check('  in the row itself, not behind the actions menu',
    /key: 'answer'/.test(TABLE) && !/label: 'Approve'/.test(TABLE), 'an answer column');
  check('  wired to the existing server-side review endpoint',
    /onApprove=\{\(id\) => reviewRequest\(id, 'approve'\)\}/.test(PAGE)
      && /onDecline=\{\(id\) => reviewRequest\(id, 'decline'\)\}/.test(PAGE),
    'song-request-review');
  check('  and only on a request nobody has answered',
    /isActionable\(r\) && !readOnly \? \(/.test(TABLE), 'isActionable');
  check('  so an answered row offers nothing, and a track’s menu is untouched',
    /if \(r\.kind !== 'track'\) return \[\];/.test(TABLE), 'no menu on a request');
  check('a track carries Edit and Remove instead',
    /label: 'Edit'/.test(TABLE) && /label: 'Remove'/.test(TABLE), 'the couple’s own rows');

  // ── A couple can build a playlist without an external service ─────────────
  check('there is a way to add a song by hand',
    /function SongModal\(/.test(PAGE) && /Add a song/.test(PAGE), 'SongModal');
  check('  and it saves through the mutations that already existed',
    /addTrackMutation\.mutateAsync\(fields\)/.test(PAGE) && /updateTrackMutation\.mutateAsync\(\{ id: songModal\.id/.test(PAGE),
    'one handler, both jobs');
  check('  editing a row opens the same modal', /const handleEditTrack = \(track\) => setSongModal\(track\)/.test(PAGE), 'one modal');

  // ── Link a playlist is preserved ─────────────────────────────────────────
  check('the existing linked playlist still works and is still saved',
    /savePlaylistUrl/.test(PAGE) && /parsePlaylistLink\(playlistUrl\)/.test(PAGE), 'the embed is preserved');

  // ── The rows themselves ───────────────────────────────────────────────────
  check('the row builder is a module a test can read', typeof build === 'function', 'musicRows.js');
  if (typeof build !== 'function') return results;

  const rows = build({
    tracks: [
      { id: 1, song_title: 'Zebra', artist: 'B', category: 'dancing' },
      { id: 2, song_title: 'Alpha', artist: 'A', category: 'ceremony', notes: 'first dance' },
    ],
    requests: [
      { id: 9, title: 'Waiting', artist: 'C', status: 'pending', submittedBy: 'Sam', guestNote: 'please' },
      { id: 10, title: 'Old', artist: 'D', status: 'declined' },
    ],
  });
  check('a request nobody has answered sorts above everything else',
    rows[0].song === 'Waiting', rows.map((r) => r.song).join(' → '));
  check('  then the couple’s tracks in the order the day runs',
    rows[1].song === 'Alpha' && rows[2].song === 'Zebra', 'ceremony before dancing');
  check('  and an answered request does not jump the queue',
    rows[3].song === 'Old', rows[3].song);
  check('a request carries who asked and what they said',
    rows[0].askedBy === 'Sam' && rows[0].notes === 'please', `${rows[0].askedBy} / ${rows[0].notes}`);
  check('a track carries its tag and its notes',
    rows[1].tag === 'ceremony' && rows[1].notes === 'first dance', 'both');
  check('only a pending request is actionable',
    lib.isActionable(rows[0]) && !lib.isActionable(rows[1]) && !lib.isActionable(rows[3]), 'one of four');

  // ── The tags are the ones the schema declares ─────────────────────────────
  const declared = [...(SCHEMA.match(/"category"[\s\S]*?"enum":\s*\[([\s\S]*?)\]/) || [])[1]
    .matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  check('every tag the table offers is one the schema declares',
    lib.TAG_ORDER.every((t) => declared.includes(t)) && lib.TAG_ORDER.length === declared.length,
    lib.TAG_ORDER.join(', '));

  // ── The stop, recorded where it happened ──────────────────────────────────
  check('category is still a fixed enum — a couple’s own tag has nowhere to go',
    /"category":\s*\{\s*"type":\s*"string",\s*"enum"/.test(SCHEMA), 'schema unchanged');
  check('  and no field on a track could name a playlist',
    !/"playlist"/.test(SCHEMA), 'nothing to assign a track to');

  return results;
}
