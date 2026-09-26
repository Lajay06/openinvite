/**
 * Playlists a couple names, and a tag the enum cannot hold.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Goal 2026-09-25, item 4.
 *
 *   "Playlist column. 'Create playlist' names a new one (a name is a string on
 *   the tracks that belong to it, nothing else); 'Link playlist' assigns a
 *   track to an existing name; the accordion groups by playlist name.
 *   WeddingDetails.music.playlists[] remains the list of names; a track's
 *   playlist must be one of them or empty."
 *
 *   "Category select gains 'Something else…' as its last option. Choosing it
 *   reveals a short text field that writes categoryOther and clears category;
 *   the row's tag shows categoryOther. Choosing any of the six clears
 *   categoryOther. Never both set. The six-tag guard stays green."
 *
 * ── WHERE A PLAYLIST LIVES, AND WHY IT IS NOT AN ENTITY ────────────────────
 *
 * The NAMES are on the wedding (WeddingDetails.music.playlists[]); the
 * MEMBERSHIP is on the track (Music.playlist). That is the whole relationship,
 * and it is why assignment is a select over the couple's own names rather than
 * free text: a name that is not one of theirs would orphan the track under a
 * heading that does not exist.
 *
 * It also means there is no membership list to keep in step and no trackCount
 * to go stale — a count of rows that already exist is not a thing to store.
 *
 * ── NEVER BOTH TAGS ────────────────────────────────────────────────────────
 *
 * `category` is a fixed six-value enum, so a couple's own words could never go
 * in it; `categoryOther` was declared beside it for exactly that. The save
 * writes one and clears the other to '' — not undefined, because an undefined
 * field is not a write and the old value would survive the edit. If a row ever
 * arrives with both, the declared category wins: it is the one the schema can
 * validate.
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

export async function runMusicPlaylistsAndOwnTag() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Music — playlists a couple names, and a tag the enum cannot hold:\n');

  // ── the surfaces, readable with or without the lib ────────────────────────
  check('the table has a Playlist column', /key: 'playlist', label: 'Playlist'/.test(TABLE), 'column');
  check('  and it can be sorted', /playlist: \{ getValue/.test(TABLE), 'sortable');
  check('the table groups by playlist name, as a filter over the same rows',
    /placeholder: 'All playlists'/.test(TABLE) && /r\.playlist !== playlist/.test(TABLE),
    'narrows rather than duplicating');
  check('  with a way to see what is in no playlist',
    /Not in a playlist/.test(TABLE) && /playlist === '__none'/.test(TABLE), '__none');
  check('"Create playlist" is reachable — it existed and nothing called it',
    /Create playlist/.test(PAGE) && /onClick=\{handleAddPlaylist\}/.test(PAGE), 'wired');
  check('  it appends a NAME and nothing else',
    /playlists: \[\.\.\.current, name\]/.test(PAGE), 'a string, not an object');
  check('  and refuses a duplicate name',
    /already have a playlist with that name/.test(PAGE), 'named refusal');
  check('assignment is a select over the couple’s own names, not free text',
    /playlists\.map\(p => <option key=\{p\} value=\{p\}>\{p\}<\/option>\)/.test(PAGE), 'select');
  check('  with "Not in a playlist" as the empty choice', /Not in a playlist/.test(PAGE), 'empty is allowed');
  // ONE READER, NOT A COUNT. Asserting a call count broke the moment the
  // duplicate-name check became a third caller, which is a sign the count was
  // the wrong property to pin. What matters is that every consumer is handed
  // playlistNames' output and nothing reads music.playlists for names itself.
  check('the table is handed the names from one reader',
    /<MusicTable[\s\S]{0,120}playlists=\{playlistNames\(details\)\}/.test(PAGE), 'MusicTable');
  check('  and so is the modal',
    /<SongModal[\s\S]{0,120}playlists=\{playlistNames\(details\)\}/.test(PAGE), 'SongModal');
  check('  nothing maps over music.playlists for names outside that reader',
    !/music\?\.playlists\s*\|\|\s*\[\]\)\.map/.test(PAGE), 'one reader');

  // ── the tag ───────────────────────────────────────────────────────────────
  check('"Something else…" is the last tag option',
    /\[\.\.\.TAG_ORDER, 'other'\]/.test(PAGE) && /Something else/.test(PAGE), 'appended, not inserted');
  check('  choosing it reveals a field', /tag === 'other' && \(/.test(PAGE), 'conditional field');
  check('  choosing one of the six clears what was typed',
    /if \(t !== 'other'\) setOwn\(''\)/.test(PAGE), 'cleared');
  check('the save writes exactly one of the two, and clears the other to ‘’',
    /category: tag === 'other' \? '' : tag,/.test(PAGE)
      && /categoryOther: tag === 'other' \? own\.trim\(\) : '',/.test(PAGE),
    'never both, never undefined');
  check('  a couple’s own tag cannot be saved empty',
    /\(tag !== 'other' \|\| own\.trim\(\)\)/.test(PAGE), 'ready requires it');

  let L = {};
  try { L = await import('../../src/lib/musicRows.js'); } catch { /* reported below */ }
  check('the resolution is a module a test can read', typeof L.resolveTag === 'function', 'musicRows.js');
  if (typeof L.resolveTag !== 'function') return results;
  const { resolveTag, resolvePlaylist, playlistNames, buildMusicRows, TAG_ORDER } = L;

  // ── resolveTag ────────────────────────────────────────────────────────────
  check('a declared category resolves to its label',
    JSON.stringify(resolveTag({ category: 'dancing' })) === JSON.stringify({ tag: 'dancing', label: 'Dancing', isOwn: false }),
    'Dancing');
  check('  a couple’s own tag resolves to their words, flagged as theirs',
    JSON.stringify(resolveTag({ categoryOther: "Nan's request" }))
      === JSON.stringify({ tag: "Nan's request", label: "Nan's request", isOwn: true }), 'isOwn');
  check('  neither set resolves to nothing, not to a default',
    resolveTag({}).tag === '' && resolveTag(null).tag === '', 'empty');
  check('  and if a row somehow has both, the declared one wins',
    resolveTag({ category: 'dinner', categoryOther: 'x' }).tag === 'dinner', 'the schema can validate it');

  // ── the names ─────────────────────────────────────────────────────────────
  check('playlist names are deduped and trimmed',
    JSON.stringify(playlistNames({ music: { playlists: [{ name: 'Drinks' }, { name: ' Dancing ' }, { name: 'Drinks' }] } }))
      === JSON.stringify(['Drinks', 'Dancing']), 'two');
  check('  and both the old object rows and plain names are read',
    JSON.stringify(playlistNames({ music: { playlists: [{ name: 'Drinks' }, 'Dancing'] } }))
      === JSON.stringify(['Drinks', 'Dancing']), 'old rows keep working');
  check('  a wedding with none gets an empty list, not a crash',
    playlistNames({}).length === 0 && playlistNames(null).length === 0, 'empty');
  check('a track’s playlist is read as a trimmed name',
    resolvePlaylist({ playlist: ' Drinks ' }) === 'Drinks' && resolvePlaylist({}) === '', 'trimmed');

  // ── the rows the table renders ────────────────────────────────────────────
  const rows = buildMusicRows({
    tracks: [{ id: 1, song_title: 'A', artist: 'B', categoryOther: 'Nan', playlist: 'Drinks' }],
    requests: [{ id: 9, title: 'W', artist: 'C', status: 'pending' }],
  });
  const track = rows.find((r) => r.kind === 'track');
  const request = rows.find((r) => r.kind === 'request');
  check('a track row carries its playlist and its own-tag label',
    track.playlist === 'Drinks' && track.tagLabel === 'Nan' && track.tagIsOwn === true, JSON.stringify(track.tagLabel));
  check('  and a request carries no playlist — it is not a track yet',
    request.playlist === '' && request.tagIsOwn === false, 'empty until approved');

  // ── the six-tag guard stays green ─────────────────────────────────────────
  check('the six declared tags are untouched',
    JSON.stringify(TAG_ORDER) === JSON.stringify(
      ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general']),
    TAG_ORDER.join(', '));
  check('  and a couple’s own tag sorts after them, not among them',
    /TAG_ORDER\.indexOf\(r\.tag\) === -1 \? TAG_ORDER\.length/.test(TABLE), 'no place in a day’s sequence');

  // ── both fields are declared, so neither is silently dropped ─────────────
  const MIRROR = JSON.parse(read('base44/entities/Music.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  check('Music.playlist is declared in the mirror', !!MIRROR.properties.playlist, 'declared');
  check('Music.categoryOther is declared in the mirror', !!MIRROR.properties.categoryOther, 'declared');
  check('  and category is still the fixed six', MIRROR.properties.category.enum.length === 6, 'six');

  return results;
}
