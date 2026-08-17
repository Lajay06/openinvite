import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Music2, Plus, Share2, Settings, X, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SpotifySearch from '../components/music/SpotifySearch';
import SpotifyModal from '../components/music/SpotifyModal';
import MusicSuggestionsModal from '../components/music/MusicSuggestionsModal';
import SharePlaylist from '../components/music/SharePlaylist';
import MusicList from '../components/music/MusicList';
import MusicForm from '../components/music/MusicForm';
import AddFromLink from '../components/music/AddFromLink';
import VendorRosterSection from '../components/vendors/VendorRosterSection';
import PageConsiderations from '../components/shared/PageConsiderations';
import { Textarea } from '@/components/ui/textarea';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import { interactiveDivProps } from '@/lib/a11y';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CountUp from "@/components/shared/CountUp";

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Song request settings</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ToggleRow label="Enable guest song requests" value={details?.music?.guestRequestsEnabled} onChange={v => updateMusic('guestRequestsEnabled', v)} />
          <ToggleRow label="Require approval before adding" value={details?.music?.requestsRequireApproval} onChange={v => updateMusic('requestsRequireApproval', v)} />
          <ToggleRow label="One request per guest" value={details?.music?.limitOnePerGuest} onChange={v => updateMusic('limitOnePerGuest', v)} />
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Message to guests</span>
            <Textarea value={details?.music?.requestMessage || ''} onChange={e => updateMusic('requestMessage', e.target.value)} placeholder="Tell guests about your song request policy…" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ fontSize: 13 }}>Done</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MusicPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('playlist');
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [requestFilter, setRequestFilter] = useState('pending');
  const [showSearch, setShowSearch] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [avaOpen, setAvaOpen] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
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
      if (current.id) await base44.entities.WeddingDetails.update(current.id, updates);
      else await base44.entities.WeddingDetails.create({ ...updates, slug: 'temp' });
    },
    onSuccess: () => queryClient.invalidateQueries(['musicDetails']),
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
      toast.success(action === 'add' ? 'Added to your list' : 'Request declined');
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

  const playlists = (details?.music?.playlists || []).filter(p => p.enabled);
  const pendingCount = (songRequests || []).filter(r => r.status === 'pending').length;
  const approvedCount = playlistTracks.filter(t => t.approved).length;
  const guestCount = playlistTracks.filter(t => t.guest_suggestion).length;

  const closeAddPanels = () => { setShowSearch(false); setShowAddForm(false); setShowAddLink(false); setEditingTrack(null); };

  const handleAddTrack = async (track) => {
    try {
      await addTrackMutation.mutateAsync(track);
      closeAddPanels();
      toast.success('Track added');
    } catch {
      toast.error('Failed to add track');
    }
  };

  const handleEditTrack = (track) => { setEditingTrack(track); setShowAddForm(true); setShowSearch(false); setShowAddLink(false); };
  const handleUpdateTrack = async (updated) => {
    try {
      await updateTrackMutation.mutateAsync({ id: editingTrack.id, updates: updated });
      setEditingTrack(null); setShowAddForm(false);
      toast.success('Track updated');
    } catch {
      toast.error('Failed to update track');
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
  const handleToggleApproval = async (track) => {
    try {
      await updateTrackMutation.mutateAsync({ id: track.id, updates: { approved: !track.approved } });
    } catch {
      toast.error('Failed to update track');
    }
  };

  const handleAddPlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const current = details?.music?.playlists || [];
    const newPl = { id: `custom-${Date.now()}`, name, trackCount: 0, enabled: true };
    updateMutation.mutate({ music: { ...(details?.music || {}), playlists: [...current, newPl] } });
    setNewPlaylistName('');
    setAddingPlaylist(false);
    setActivePlaylist(newPl);
  };


  const filteredRequests = (songRequests || []).filter(r => r.status === requestFilter);

  const playlistStats = {
    totalSongs: playlistTracks.length,
    approvedSongs: approvedCount,
    guestSuggestions: guestCount,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Music" subtitle="Plan playlists, add songs and manage guest song requests" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Playlists', value: playlists.length },
          { label: 'Total songs', value: playlistTracks.length },
          { label: 'Song requests', value: songRequests?.length || 0 },
          { label: 'Pending approval', value: pendingCount, last: true },
        ].map((s, i) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: s.last ? 'none' : '1px solid rgba(10,10,10,0.08)' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava + toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
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
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
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
        <div className="overflow-x-auto" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <div style={{ display: 'flex', height: 680, minWidth: 700 }}>
          {/* Left: Playlists */}
          <div style={{ width: 220, borderRight: '1px solid rgba(10,10,10,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid rgba(10,10,10,0.06)', flexShrink: 0 }}>
              <span style={labelStyle}>Your playlists</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {playlists.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                    No playlists yet. Create your first one below.
                  </p>
                </div>
              )}
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => setActivePlaylist(pl)}
                  {...interactiveDivProps(() => setActivePlaylist(pl))}
                  style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${activePlaylist?.id === pl.id ? '#E03553' : 'transparent'}`, background: activePlaylist?.id === pl.id ? 'rgba(224,53,83,0.05)' : 'transparent' }}>
                  <div style={{ width: 32, height: 32, background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music2 size={14} style={{ color: '#0A0A0A' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                      {playlistTracks.filter(t => t.category === pl.id).length} songs
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Add playlist */}
            {!readOnly && (
              <div style={{ borderTop: '1px solid rgba(10,10,10,0.06)', padding: '10px 16px', flexShrink: 0 }}>
                {addingPlaylist ? (
                  <div>
                    <input
                      autoFocus
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddPlaylist(); if (e.key === 'Escape') { setAddingPlaylist(false); setNewPlaylistName(''); } }}
                      placeholder="Playlist name…"
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #E03553', background: 'none', fontSize: 13, fontFamily: PJS, padding: '4px 0', outline: 'none', color: '#0A0A0A', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={handleAddPlaylist} className="btn-primary" style={{ fontSize: 11, flex: 1 }}>Add</button>
                      <button onClick={() => { setAddingPlaylist(false); setNewPlaylistName(''); }} className="btn-editorial-secondary" style={{ fontSize: 11, flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingPlaylist(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: '2px 0', width: '100%' }}>
                    <Plus size={11} />Add playlist
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Center: Search + Tracks */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
            {/* Center header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{activePlaylist?.name || 'Select a playlist'}</p>
                <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                  {playlistTracks.filter(t => t.category === activePlaylist?.id).length} songs
                </p>
              </div>
              {!readOnly && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setShowSearch(v => !v); setShowAddForm(false); setShowAddLink(false); setEditingTrack(null); }}
                    className={showSearch ? 'btn-primary' : 'btn-editorial-secondary'}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={12} />Search Spotify
                  </button>
                  <button onClick={() => { setShowAddLink(v => !v); setShowSearch(false); setShowAddForm(false); setEditingTrack(null); }}
                    className={showAddLink ? 'btn-primary' : 'btn-editorial-secondary'}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Link2 size={12} />Add from a link
                  </button>
                  <button onClick={() => { setShowAddForm(v => !v); setShowSearch(false); setShowAddLink(false); setEditingTrack(null); }}
                    className="btn-editorial-secondary"
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={12} />Add manually
                  </button>
                </div>
              )}
            </div>

            {/* SpotifySearch */}
            {showSearch && (
              <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <SpotifySearch
                  onAdd={(track) => handleAddTrack({ ...track, category: activePlaylist?.id || 'general' })}
                  onClose={() => setShowSearch(false)}
                />
              </div>
            )}

            {/* AddFromLink — Apple Music / YouTube (or a raw Spotify link) */}
            {showAddLink && (
              <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <AddFromLink
                  onAdd={(track) => handleAddTrack({ ...track, category: activePlaylist?.id || 'general' })}
                  onClose={() => setShowAddLink(false)}
                />
              </div>
            )}

            {/* MusicForm */}
            {showAddForm && (
              <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <MusicForm
                  item={editingTrack ? { ...editingTrack, category: editingTrack.category || activePlaylist?.id } : { category: activePlaylist?.id || 'general' }}
                  onSubmit={editingTrack ? handleUpdateTrack : (d) => handleAddTrack({ ...d, category: d.category || activePlaylist?.id || 'general' })}
                  onCancel={() => { setShowAddForm(false); setEditingTrack(null); }}
                />
              </div>
            )}

            {/* Track list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <MusicList
                items={playlistTracks.filter(t => !activePlaylist || t.category === activePlaylist.id)}
                groupByCategory={!activePlaylist}
                onEdit={readOnly ? undefined : handleEditTrack}
                onDelete={readOnly ? undefined : handleDeleteTrack}
                onToggleApproval={readOnly ? undefined : handleToggleApproval}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Right: Song Requests */}
          <div style={{ width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 10px' }}>Song requests</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['pending', 'approved', 'added', 'declined'].map(status => (
                  <button key={status} onClick={() => setRequestFilter(status)}
                    style={{ padding: '3px 10px', border: 'none', background: requestFilter === status ? '#E03553' : 'rgba(10,10,10,0.06)', color: requestFilter === status ? '#FFFFFF' : 'rgba(10,10,10,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 999, fontFamily: PJS, whiteSpace: 'nowrap', transition: 'background 0.12s, color 0.12s' }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}{status === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRequests.length === 0 ? (
                <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center', padding: '32px 0' }}>No {requestFilter} requests</p>
              ) : (
                filteredRequests.map(req => {
                  const actionable = !readOnly && (req.status === 'pending' || req.status === 'approved');
                  const busy = reviewRequestMutation.isPending && reviewRequestMutation.variables?.songRequestId === req.id;
                  return (
                  <div key={req.id} style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
                    <div style={{ display: 'flex', gap: 10, padding: 12 }}>
                      {req.albumArt && <img src={req.albumArt} style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} alt={`${req.title} album art`} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
                        <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0' }}>{req.artist}</p>
                        <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>by {req.submittedBy}</p>
                      </div>
                    </div>
                    {req.guestNote && (
                      <div style={{ padding: '6px 12px', background: '#FAFAFA', borderTop: '1px solid rgba(10,10,10,0.05)' }}>
                        <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'italic', margin: 0 }}>"{req.guestNote}"</p>
                      </div>
                    )}
                    {actionable && (
                      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid rgba(10,10,10,0.05)' }}>
                        <button
                          onClick={() => reviewRequestMutation.mutate({ songRequestId: req.id, action: 'add' })}
                          disabled={busy}
                          style={{ flex: 1, padding: '6px 0', border: 'none', background: '#166534', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: PJS, borderRadius: 999 }}
                        >
                          Add to my list
                        </button>
                        <button
                          onClick={() => reviewRequestMutation.mutate({ songRequestId: req.id, action: 'decline' })}
                          disabled={busy}
                          style={{ flex: 1, padding: '6px 0', border: '1px solid rgba(10,10,10,0.15)', background: 'none', color: 'rgba(10,10,10,0.6)', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: PJS, borderRadius: 999 }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
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
      {showSuggestions && (
        <MusicSuggestionsModal isOpen={showSuggestions} onClose={() => setShowSuggestions(false)} onAddSuggestion={(s) => { handleAddTrack({ ...s, approved: true, guest_suggestion: false }); }} />
      )}
      {showShare && <SharePlaylist onClose={() => setShowShare(false)} playlistStats={playlistStats} />}
      {showSpotifyModal && (
        <SpotifyModal
          playlistId={activePlaylist?.id}
          onAdd={(track) => handleAddTrack({ ...track, category: activePlaylist?.id || 'general' })}
          onClose={() => setShowSpotifyModal(false)}
        />
      )}

      {/* Settings modal */}
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
        pageTitle="Music curator"
        systemPrompt="You are Ava, a wedding music curator. Help plan playlists, find songs, and coordinate music. If the couple has selected cultures and traditions, suggest traditional music moments relevant to those traditions where useful (e.g. Bhangra/Bollywood sets for South Asian heritage, a processional style tied to their ceremony tradition)."
        quickActions={["Suggest first dance songs", "Build a reception playlist", "What songs to avoid?", "Ceremony music suggestions"]}
      />
    </div>
  );
}
