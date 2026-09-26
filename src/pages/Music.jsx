import { OptionAccordion, OptionAccordionSection } from '@/components/shared/OptionAccordion';
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { parsePlaylistLink } from '@/lib/musicLinkParser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';
import SharePlaylist from '../components/music/SharePlaylist';
import VendorRosterSection from '../components/vendors/VendorRosterSection';
import PageConsiderations from '../components/shared/PageConsiderations';
import { Textarea } from '@/components/ui/textarea';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CountUp from "@/components/shared/CountUp";
import MusicTable from '@/components/music/MusicTable';
import { TAG_ORDER, TAG_LABEL, resolveTag, playlistNames } from '@/lib/musicRows';
import { DEFAULT_MUSIC_REQUEST_MESSAGE } from '@/lib/musicCopy';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};

// ── Music rebuild styles (2026-08-18) ─────────────────────────────────────
const helpTextStyle = {
  fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
  margin: '6px 0 0', lineHeight: 1.5, maxWidth: 560,
};
const playlistInputStyle = {
  width: '100%', maxWidth: 560, marginTop: 14, boxSizing: 'border-box',
  border: 'none', borderBottom: '1.5px solid rgba(10,10,10,0.15)',
  background: 'transparent', fontSize: 14, fontFamily: PJS,
  color: '#0A0A0A', outline: 'none', padding: '6px 0',
};
const pillStyle = {
  borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600,
  fontFamily: PJS, color: '#0A0A0A', border: '1px solid rgba(10,10,10,0.15)',
};

const TABS = [
  { key: 'playlist',       label: 'Playlist' },
  { key: 'vendor',         label: 'Vendor' },
  { key: 'notes',          label: 'Notes' },
  { key: 'considerations', label: 'Considerations' },
];


function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</span>
      <button onClick={() => onChange(!value)} aria-label={label} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: value ? '#E03553' : 'rgba(10,10,10,0.12)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

function SettingsModal({ details, updateMusic, onClose }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Song request settings" className="max-w-[440px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Song request settings</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ToggleRow label="Enable guest song requests" value={details?.music?.guestRequestsEnabled} onChange={v => updateMusic('guestRequestsEnabled', v)} />
          <ToggleRow label="Require approval before adding" value={details?.music?.requestsRequireApproval} onChange={v => updateMusic('requestsRequireApproval', v)} />
          <ToggleRow label="One request per guest" value={details?.music?.limitOnePerGuest} onChange={v => updateMusic('limitOnePerGuest', v)} />
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Message to guests</span>
            {/* PRE-FILLED AS A REAL VALUE, not a placeholder. This default publishes,
                and a gray placeholder that publishes verbatim tells the couple the
                opposite of what happens. They see the actual words, in the field,
                and can edit or clear them. `??` distinguishes never-set (takes the
                default) from deliberately-cleared (publishes nothing). */}
            <Textarea value={details?.music?.requestMessage ?? DEFAULT_MUSIC_REQUEST_MESSAGE} onChange={e => updateMusic('requestMessage', e.target.value)} placeholder="What guests see above the song search" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.12)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ fontSize: 13 }}>Done</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ADD OR EDIT ONE SONG.
 *
 * Round two, item 12: "Done when a couple can build a playlist WITHOUT ANY
 * EXTERNAL SERVICE." Until now they could not. Every track in the product
 * arrived one way — a guest asked for it and the couple approved — and the
 * page's own add/edit handlers existed with nothing rendering them, so there
 * was no screen on which a couple could type in a song of their own, retag one
 * or fix a typo.
 *
 * Song and artist are what the Music entity requires; tag and notes are the
 * two columns the table exists to make editable.
 */
function SongModal({ track, playlists = [], onSave, onClose }) {
  const [song, setSong] = useState(track?.song_title || '');
  const [artist, setArtist] = useState(track?.artist || '');
  const resolved = resolveTag(track);
  // 'other' is a UI state, never a stored value. The stored shape is exactly
  // one of category / categoryOther — see handleSave below.
  const [tag, setTag] = useState(resolved.isOwn ? 'other' : (resolved.tag || 'general'));
  const [own, setOwn] = useState(resolved.isOwn ? resolved.tag : '');
  const [playlist, setPlaylist] = useState(track?.playlist || '');
  const [notes, setNotes] = useState(track?.notes || '');
  const editing = !!track?.id;
  const ready = song.trim() && artist.trim() && (tag !== 'other' || own.trim());

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title={editing ? 'Edit song' : 'Add a song'} className="max-w-[440px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{editing ? 'Edit song' : 'Add a song'}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Song</span>
            <input value={song} onChange={e => setSong(e.target.value)} placeholder="Song title" style={playlistInputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Artist</span>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" style={playlistInputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Tag</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...TAG_ORDER, 'other'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTag(t); if (t !== 'other') setOwn(''); }}
                  style={{
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: PJS,
                    fontSize: 12, fontWeight: 600,
                    background: tag === t ? '#0A0A0A' : 'transparent',
                    color: tag === t ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
                    border: `1px solid ${tag === t ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
                  }}
                >
                  {t === 'other' ? 'Something else…' : TAG_LABEL[t]}
                </button>
              ))}
            </div>
            {/* CHOOSING IT REVEALS THE FIELD, and choosing any of the six hides
                it and clears what was typed — so the two can never both be set.
                `category` is a fixed enum; this is the only place a couple's
                own words can go. */}
            {tag === 'other' && (
              <input
                value={own}
                onChange={e => setOwn(e.target.value)}
                placeholder="Your own tag"
                maxLength={40}
                style={playlistInputStyle}
              />
            )}
          </div>
          {playlists.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={labelStyle}>Playlist</span>
              {/* A SELECT OVER THE NAMES THE COUPLE HAS MADE, not free text. The
                  names live on the wedding record; this is the assignment, and a
                  name that is not one of theirs would orphan the track. */}
              <select
                value={playlist}
                onChange={e => setPlaylist(e.target.value)}
                style={{ ...playlistInputStyle, appearance: 'auto' }}
              >
                <option value="">Not in a playlist</option>
                {playlists.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Notes</span>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the band or DJ should know" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.12)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
          <button
            onClick={() => onSave({
              song_title: song.trim(),
              artist: artist.trim(),
              // NEVER BOTH. One of the two carries the tag and the other is
              // cleared to '' — not left undefined, because an undefined field
              // is not a write and the old value would survive the edit.
              category: tag === 'other' ? '' : tag,
              categoryOther: tag === 'other' ? own.trim() : '',
              playlist,
              notes: notes.trim(),
            })}
            disabled={!ready}
            className="btn-primary"
            style={{ fontSize: 13, opacity: ready ? 1 : 0.4 }}
          >
            {editing ? 'Save' : 'Add song'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MusicPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('playlist');
  const [activePlaylist, setActivePlaylist] = useState(null);
  // OPENS ON ALL. The page opened on Pending, and in production Pending is
  // empty while 235 requests exist — so a couple landed on a blank list under a
  // headline reading 235 and had to guess that the requests were behind another
  // tab.
  //
  // NOT "the first non-empty tab", which was the tempting answer. A DEFAULT VIEW
  // SHOULD NOT DEPEND ON DATA THAT CAN CHANGE UNDER IT: a tab that moves when
  // the underlying set empties teaches a couple that the product rearranges
  // itself, and they stop trusting where things are. A stable position plus a
  // count directs attention without moving the furniture.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [songModal, setSongModal] = useState(null); // null | 'new' | track
  const [avaOpen, setAvaOpen] = useState(false);
  const [addingPlaylist, setAddingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Always read-only while collaborating — same reasoning as every other
  // newly-wired page (admin key 403s writes to any owner-scoped entity
  // regardless of the 'edit' bit). The Vendor tab is hidden entirely for
  // collaborators rather than shown empty: music vendors are the Vendor
  // entity filtered to category==='music', which isn't one of Music's own
  // mapped entities (collaboratorPageMap.js) — a collaborator only sees
  // that data if they were separately granted the "Vendors" permission,
  // via the real Vendors page, not smuggled in through Music.
  const readOnly = isCollaborating;

  // A single collaborator-data.js fetch replaces all four queries below
  // when collaborating — same cache-key shape so the rest of the page
  // (which reads `details`/`songRequests`/`tracksData`) needs no changes.
  const collabDataQuery = useQuery({
    queryKey: ['collabMusicData', collab.ownerUserId],
    enabled: isCollaborating,
    queryFn: async () => {
      const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Music`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
      });
      if (!res.ok) return { weddingDetails: {}, SongRequest: [], Music: [] };
      const { data } = await res.json();
      return data;
    },
  });

  const { data: ownDetails } = useQuery({
    queryKey: ['musicDetails'],
    enabled: !isCollaborating,
    queryFn: async () => await getMyWeddingDetails(),
  });
  const details = isCollaborating ? collabDataQuery.data?.weddingDetails : ownDetails;

  // NOT getMyRecords('SongRequest') — SongRequest rows are written by
  // api/song-request-submit.js via the admin key, and Base44 always stamps
  // admin-key creates created_by_id: "anonymous" regardless of what's sent
  // (same pattern as RsvpResponse/GuestContactSubmission — see
  // BASE44_PLATFORM_NOTES.md), so a created_by_id-scoped query can never
  // see a single real guest submission. api/song-request-review.js resolves
  // the caller's own wedding server-side and scopes by weddingId instead.
  const { data: ownSongRequests } = useQuery({
    queryKey: ['songRequests'],
    enabled: !isCollaborating,
    queryFn: async () => {
      try {
        const res = await fetch('/api/song-request-review', {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) return [];
        const { requests } = await res.json();
        return requests || [];
      } catch { return []; }
    },
  });
  const songRequests = isCollaborating ? collabDataQuery.data?.SongRequest : ownSongRequests;

  // Every track — search-added or link-pasted — is a real Music entity
  // record (created_by_id-scoped, per CLAUDE.md's base44.entities.* rule),
  // grouped into playlists via its `category` field.
  const { data: ownTracksData } = useQuery({
    queryKey: ['musicTracks'],
    enabled: !isCollaborating,
    queryFn: async () => { try { return await getMyRecords('Music'); } catch { return []; } },
  });
  const playlistTracks = (isCollaborating ? collabDataQuery.data?.Music : ownTracksData) || [];

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const current = details || {};
      // REFUSES RATHER THAN INVENTS. This used to
      // `create({ ...updates, slug: 'temp' })` — minting a WeddingDetails the
      // couple never named, as a side effect of toggling a music switch, and
      // giving every such record the SAME address.
      //
      // Reachability, checked before deleting it: /Music sits behind
      // ProtectedRoute, which verifies authentication and nothing else, and
      // this page tolerates a missing record throughout via `details?.`. So a
      // signed-up user who never completed onboarding can reach it. That is a
      // state that should not exist, and the honest response is to say so
      // rather than to fabricate a wedding to hang the setting on.
      if (!current.id) {
        throw new Error('No wedding record to save music settings against. ' +
          'Reached /Music without an onboarded wedding — the record is created by ' +
          'onboarding, never here.');
      }
      await base44.entities.WeddingDetails.update(current.id, updates);
    },
    onSuccess: () => queryClient.invalidateQueries(['musicDetails']),
    // IT HAD NO onError. A thrown refusal went into react-query's mutation
    // state and nothing rendered it, so the toggle silently did nothing —
    // which is the defect our own rule names, on a control the couple pressed.
    onError: () => toast.error('Finish setting up your wedding first — then your music settings will save.'),
  });

  const addTrackMutation = useMutation({
    mutationFn: async (track) => base44.entities.Music.create({ source: 'spotify', approved: true, guest_suggestion: false, ...track }),
    onSuccess: () => queryClient.invalidateQueries(['musicTracks']),
  });
  const updateTrackMutation = useMutation({
    mutationFn: async ({ id, updates }) => base44.entities.Music.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries(['musicTracks']),
  });
  const deleteTrackMutation = useMutation({
    mutationFn: async (id) => base44.entities.Music.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['musicTracks']),
  });

  // 'add' bridges the request straight onto the real Music list (creates
  // the Music entry + sets SongRequest.status to 'added', server-side,
  // ownership-verified) — one click, not a separate approve-then-add step.
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ songRequestId, action }) => {
      const res = await fetch('/api/song-request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        body: JSON.stringify({ songRequestId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries(['songRequests']);
      if (action === 'add') queryClient.invalidateQueries(['musicTracks']);
      toast.success(action === 'decline' ? 'Request declined' : 'Request approved');
    },
    onError: (err) => toast.error(err.message || 'Something went wrong.'),
  });

  useEffect(() => {
    if (!activePlaylist && details?.music?.playlists?.length) {
      setActivePlaylist(details.music.playlists[0]);
    }
  }, [details]);

  // Step 2b stage (c): the Spotify OAuth connect flow is gone. Nothing writes
  // WeddingDetails.music.spotifyConnection any more — the callback and
  // session-fetch endpoints were deleted, so there is no token bundle to pick
  // up and persist. Track search still works; it runs on the server's own app
  // credentials and never needed a couple's account.


  const updateMusic = (field, value) =>
    updateMutation.mutate({ music: { ...(details?.music || {}), [field]: value } });

  // Step 2b stage (c): connect/disconnect handlers removed with the OAuth
  // endpoints. Spotify track SEARCH is unaffected — it runs on the server's
  // client_credentials app token and never used a couple's account.

  // ── Playlist link (music rebuild, 2026-08-18) ──────────────────────────
  // One link, stored raw. The SOURCE IS NOT STORED — parseMusicLink derives it
  // from the URL every render, so a link edited from Spotify to Apple Music can
  // never disagree with a stale stored label (advisor ruling 2).
  const storedPlaylist = (details?.music?.playlists || [])[0] || null;
  const [playlistUrl, setPlaylistUrl] = useState('');
  useEffect(() => { setPlaylistUrl(storedPlaylist?.playlistUrl || ''); }, [storedPlaylist?.playlistUrl]);
  const playlistSource = playlistUrl ? (parsePlaylistLink(playlistUrl)?.sourceLabel || null) : null;

  const savePlaylistUrl = () => {
    const next = playlistUrl.trim();
    if (next === (storedPlaylist?.playlistUrl || '')) return;
    // Keep the existing row's id/name so a re-paste edits rather than orphans.
    const row = { ...(storedPlaylist || { id: 'primary', name: 'Wedding playlist', enabled: true }), playlistUrl: next };
    updateMutation.mutate({ music: { ...(details?.music || {}), playlists: next ? [row] : [] } });
  };

  const allRequests = songRequests || [];
  // Counts derived once from the guarded list. The filter buttons previously
  // called songRequests.filter() inline, which threw before react-query
  // resolved and took the whole page to the error boundary.
  // A SET OF FILTERS MUST COVER ITS OWN DOMAIN.
  //
  // SongRequest.status declares four values — pending, approved, declined,
  // added — and the tabs offered three. A request marked 'added' (put on the
  // playlist by api/song-request-review.js) was counted in the headline and
  // appeared under no tab at all. Measured in production: 235 requests, of
  // which exactly one was invisible by this route.
  //
  // Anything that can be written must be reachable by something. This list is
  // the partition, and scripts/test-song-status-coverage.mjs fails if the
  // schema ever gains a value it does not contain.
  const REQUEST_STATUSES = ['pending', 'approved', 'declined', 'added'];
  // 'all' is a VIEW, not a status — it stays out of REQUEST_STATUSES so the
  // coverage guard keeps checking a real partition of the schema's enum.
  const reviewRequest = (songRequestId, action) => reviewRequestMutation.mutate({ songRequestId, action });

  const pendingCount = (songRequests || []).filter(r => r.status === 'pending').length;
  const approvedCount = (songRequests || []).filter(r => r.status === 'approved').length;

  // RULE 5: A COLLAPSED SECTION STILL SHOWS ITS DECISION. "Song requests" with
  // nothing beside it would make a couple open the section to find out whether
  // anyone is waiting on them, which is the reason to collapse it undone.
  const playlistSummary = playlistUrl ? [playlistSource || 'Playlist set'] : [];
  const requestsSummary = pendingCount
    ? [`${pendingCount} waiting on you`]
    : (allRequests.length ? [`${allRequests.length} ${allRequests.length === 1 ? 'request' : 'requests'}`] : []);
  const shareSummary = details?.slug ? [`openinvite.com.au/w/${details.slug}`] : [];
  const guestCount = (songRequests || []).length;


  // ONE MODAL, TWO JOBS. `songModal` is null when closed, the string 'new'
  // when adding, and the track itself when editing — the same shape the event
  // form on Event details uses, so there is no second piece of state that can
  // disagree about which of the two is happening.
  const handleEditTrack = (track) => setSongModal(track);
  const handleSaveSong = async (fields) => {
    try {
      if (songModal && songModal !== 'new') {
        await updateTrackMutation.mutateAsync({ id: songModal.id, updates: fields });
        toast.success('Song updated');
      } else {
        await addTrackMutation.mutateAsync(fields);
        toast.success('Song added');
      }
      setSongModal(null);
    } catch {
      toast.error('Could not save that song — try again.');
    }
  };
  const handleDeleteTrack = async (id) => {
    if (!window.confirm('Remove this track?')) return;
    try {
      await deleteTrackMutation.mutateAsync(id);
    } catch {
      toast.error('Failed to remove track');
    }
  };

  // CREATE PLAYLIST — it existed and nothing called it.
  //
  // "a name is a string on the tracks that belong to it, nothing else". So this
  // appends a NAME to WeddingDetails.music.playlists[] and stops there; a track
  // joins it by having Music.playlist set to that name. No ids to keep in step,
  // no membership list to fall out of date, and trackCount is not stored because
  // it is a count of rows that already exist.
  //
  // The existing rows are objects with { id, name, … } — playlistNames() reads
  // both shapes, so old rows keep working and new ones are the plain name the
  // ruling describes.
  const handleAddPlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    if (playlistNames(details).some(n => n.toLowerCase() === name.toLowerCase())) {
      toast.error('You already have a playlist with that name.');
      return;
    }
    const current = details?.music?.playlists || [];
    updateMutation.mutate({ music: { ...(details?.music || {}), playlists: [...current, name] } });
    setNewPlaylistName('');
    setAddingPlaylist(false);
  };



  const playlistStats = {
    totalSongs: playlistTracks.length,
    approvedSongs: approvedCount,
    guestSuggestions: guestCount,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Music" subtitle="Plan playlists, add songs and manage guest song requests" />

      {/* Said before they press anything, not after. This page is reachable
          without a wedding — ProtectedRoute checks authentication only — and
          nothing here can save until one exists. */}
      {!isCollaborating && !details?.id && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          padding: '14px 32px', background: 'rgba(224,53,83,0.06)',
          borderBottom: '1px solid rgba(224,53,83,0.25)',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
            Your wedding isn&rsquo;t set up yet, so nothing on this page can save.
          </p>
          <Link
            to={createPageUrl('Onboarding')}
            style={{ fontSize: 13, fontWeight: 700, color: '#E03553', fontFamily: PJS }}
          >
            Finish setting up
          </Link>
        </div>
      )}

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        {[
          // Track curation is gone with the Spotify search teardown, so the
          // stats now describe what this page actually holds: one playlist link
          // and the guest requests around it.
          { label: 'Playlist', value: playlistUrl ? 1 : 0 },
          { label: 'Song requests', value: guestCount },
          { label: 'Approved', value: approvedCount },
          { label: 'Pending approval', value: pendingCount, last: true },
        ].map((s, i) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: s.last ? 'none' : '1px solid rgba(10,10,10,0.12)' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava + toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <AvaButton label="Ask Ava to curate your playlist" onClick={() => setAvaOpen(true)} />
        <div className="flex flex-wrap items-center gap-[10px]">
          <button onClick={() => setShowShare(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={12} />Share playlist
          </button>
          {/* Settings hidden while collaborating — every control inside it
              (guest-request toggles, message copy, disconnect Spotify) is
              a WeddingDetails.music write. */}
          {!readOnly && (
            <button onClick={() => setShowSettings(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={12} />Settings
            </button>
          )}
        </div>
      </div>

      {/* Tab bar — Vendor hidden while collaborating, see readOnly's own comment above */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', padding: '0 32px' }}>
        {TABS.filter(tab => !isCollaborating || tab.key !== 'vendor').map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : 'rgba(10,10,10,0.45)',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PLAYLIST ───────────────────────────────────────────────────────── */}
      {activeTab === 'playlist' && (
        <div style={{ padding: '32px 32px 48px' }}>
          {/* FULL WIDTH, LIKE THE OTHER PLANNER PAGES (owner ruling, Run 4 S7).
              This was capped at maxWidth: 760 inside a panel measured at 1240px
              on a 1440 screen — 480px of nothing down the right-hand side,
              which is the "empty right column" in the walk-through. At 390 the
              cap never bound (326px of 390), so it was a desktop-only defect
              and reads as content stacked on the left. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* THE TABLE IS WHAT THIS PAGE IS NOW, so it is the section that opens.
                "Your playlist" — the link to Spotify or Apple Music — is the
                SECONDARY action in the ruling, and it was opening first while
                the songs and the requests waiting on an answer sat collapsed
                behind it. A table like every other table in the product is not
                one a couple has to unfold. */}
            <OptionAccordion initialOpenKey="requests" headingSize={13} showEmptyState={false}>

            <OptionAccordionSection sectionKey="playlist" title="Your playlist" summary={playlistSummary}>
            {/* ── 1. Your playlist ─────────────────────────────────────── */}
            <section>
              <p style={helpTextStyle}>
                Paste a link to your playlist on Spotify, Apple Music or YouTube. Guests
                can listen to it from your wedding site.
              </p>
              <input
                type="url"
                value={playlistUrl}
                onChange={e => setPlaylistUrl(e.target.value)}
                onBlur={savePlaylistUrl}
                disabled={readOnly}
                placeholder="https://open.spotify.com/playlist/…"
                style={playlistInputStyle}
              />
              {playlistUrl && !playlistSource && (
                <p style={{ ...helpTextStyle, color: '#E03553', marginTop: 8 }}>
                  That does not look like a Spotify, Apple Music or YouTube playlist link.
                </p>
              )}
              {playlistUrl && playlistSource && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <span style={pillStyle}>{playlistSource}</span>
                  <a href={playlistUrl} target="_blank" rel="noreferrer"
                     style={{ fontSize: 12, fontFamily: PJS, color: '#0A0A0A' }}>
                    Open playlist
                  </a>
                </div>
              )}
            </section>
            </OptionAccordionSection>

            <OptionAccordionSection sectionKey="requests" title="Your songs" summary={requestsSummary}>
            {/* ── 2. The table ─────────────────────────────────────────────
                Round two, item 12: one table, like every other table in the
                product — song, artist, tag, notes — with the guests' requests
                in it, carrying Approve and Decline.

                WHAT THIS REPLACES IS NOT ONLY A LIST OF REQUESTS. The couple's
                own tracks are real Music records, created when a request is
                approved, and until now NO SCREEN IN THE PRODUCT SHOWED THEM.
                `playlistTracks` was read once, for a number in the stat strip.
                The whole CRUD layer — add, edit, delete, approve — already
                existed on this page with nothing rendering it. */}
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <p style={helpTextStyle}>Your songs, and what your guests have asked for.</p>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => setSongModal('new')} className="btn-primary" style={{ fontSize: 12 }}>
                      Add a song
                    </button>
                    {/* CREATE PLAYLIST — names one, and that is all it does. */}
                    {addingPlaylist ? (
                      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <input
                          autoFocus
                          value={newPlaylistName}
                          onChange={e => setNewPlaylistName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlaylist(); } }}
                          placeholder="Playlist name"
                          maxLength={60}
                          style={{ ...playlistInputStyle, width: 180 }}
                        />
                        <button onClick={handleAddPlaylist} className="btn-primary" style={{ fontSize: 12 }}>Create</button>
                        <button onClick={() => { setAddingPlaylist(false); setNewPlaylistName(''); }}
                          className="btn-editorial-secondary" style={{ fontSize: 12 }}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setAddingPlaylist(true)} className="btn-editorial-secondary" style={{ fontSize: 12 }}>
                        Create playlist
                      </button>
                    )}
                    <button onClick={() => setShowSettings(true)} className="btn-editorial-secondary" style={{ fontSize: 12 }}>
                      Request settings
                    </button>
                  </div>
                )}
              </div>
              <MusicTable
                playlists={playlistNames(details)}
                tracks={playlistTracks}
                requests={allRequests}
                loading={false}
                readOnly={readOnly}
                onEdit={handleEditTrack}
                onDelete={handleDeleteTrack}
                onApprove={(id) => reviewRequest(id, 'approve')}
                onDecline={(id) => reviewRequest(id, 'decline')}
              />
            </section>
            </OptionAccordionSection>

            <OptionAccordionSection sectionKey="share" title="Share with guests" summary={shareSummary}>
            {/* ── 3. Share ─────────────────────────────────────────────── */}
            <section>
              <p style={helpTextStyle}>
                Send guests here to request a song, or print the code for the day.
              </p>
              <SharePlaylist slug={details?.slug} />
            </section>
            </OptionAccordionSection>

            </OptionAccordion>
          </div>
        </div>
      )}

      {/* ── VENDOR ─────────────────────────────────────────────────────────── */}
      {!isCollaborating && activeTab === 'vendor' && (
        <div style={{ padding: '32px 32px 48px' }}>
          <VendorRosterSection category="music" categoryLabel="music" />
        </div>
      )}

      {/* ── NOTES ──────────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div style={{ padding: '32px 32px 48px' }}>
          <div style={{ maxWidth: 760 }}>
            <label style={labelStyle}>Notes</label>
            <Textarea
              value={details?.music?.notes || ''}
              onChange={e => updateMusic('notes', e.target.value)}
              placeholder="Anything else about your music plans — must-plays, timing notes, vendor coordination…"
              style={{ minHeight: 200 }}
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      {/* ── CONSIDERATIONS ─────────────────────────────────────────────────── */}
      {activeTab === 'considerations' && (
        <div style={{ padding: '32px 32px 48px' }}>
          <div style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="music" />
          </div>
        </div>
      )}

      {/* Modals */}

      {/* Settings modal */}
      {songModal && (
        <SongModal
          playlists={playlistNames(details)}
          track={songModal === 'new' ? null : songModal}
          onSave={handleSaveSong}
          onClose={() => setSongModal(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          details={details}
          updateMusic={updateMusic}
          onClose={() => setShowSettings(false)}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Music"
        systemPrompt="You are Ava, a wedding music curator. Help plan playlists, find songs, and coordinate music. If the couple has selected cultures and traditions, suggest traditional music moments relevant to those traditions where useful (e.g. Bhangra/Bollywood sets for South Asian heritage, a processional style tied to their ceremony tradition)."
        quickActions={["Suggest first dance songs", "Build a reception playlist", "What songs to avoid?", "Ceremony music suggestions"]}
      />
    </div>
  );
}
