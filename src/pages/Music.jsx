import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Music2, Plus, Sparkles, Share2, Settings, X, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import SpotifySearch from '../components/music/SpotifySearch';
import SpotifyModal from '../components/music/SpotifyModal';
import MusicSuggestionsModal from '../components/music/MusicSuggestionsModal';
import SharePlaylist from '../components/music/SharePlaylist';
import MusicList from '../components/music/MusicList';
import MusicForm from '../components/music/MusicForm';
import { Textarea } from '@/components/ui/textarea';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};


function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}{suffix}</>;
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: value ? '#E03553' : 'rgba(10,10,10,0.12)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

export default function MusicPage() {
  const queryClient = useQueryClient();
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [requestFilter, setRequestFilter] = useState('pending');
  const [showSearch, setShowSearch] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [avaOpen, setAvaOpen] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [addingPlaylist, setAddingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [pendingSpotifyData, setPendingSpotifyData] = useState(null);
  const [spotifyDropdownOpen, setSpotifyDropdownOpen] = useState(false);
  const spotifyPillRef = useRef(null);

  const { data: details, isSuccess: detailsLoaded } = useQuery({
    queryKey: ['musicDetails'],
    queryFn: async () => await getMyWeddingDetails(),
  });

  const { data: songRequests } = useQuery({
    queryKey: ['songRequests'],
    queryFn: async () => { try { return await getMyRecords('SongRequest'); } catch { return []; } },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const current = details || {};
      if (current.id) await base44.entities.WeddingDetails.update(current.id, updates);
      else await base44.entities.WeddingDetails.create({ ...updates, slug: 'temp' });
    },
    onSuccess: () => queryClient.invalidateQueries(['musicDetails']),
  });

  useEffect(() => {
    if (!activePlaylist && details?.music?.playlists?.length) {
      setActivePlaylist(details.music.playlists[0]);
    }
  }, [details]);

  // ── Detect Spotify OAuth callback ─────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('spotify');
    const err = params.get('spotify_error');

    if (err) {
      toast.error('Could not connect to Spotify. Please try again.');
      const url = new URL(window.location.href);
      url.searchParams.delete('spotify_error');
      window.history.replaceState({}, '', url.toString());
      return;
    }
    if (!raw) return;

    const url = new URL(window.location.href);
    url.searchParams.delete('spotify');
    window.history.replaceState({}, '', url.toString());

    try {
      const data = JSON.parse(atob(decodeURIComponent(raw)));
      setPendingSpotifyData(data);
    } catch { /* malformed payload */ }
  }, []);

  // ── Save pending Spotify connection once WeddingDetails have loaded ────────
  useEffect(() => {
    if (!pendingSpotifyData || !detailsLoaded) return;
    updateMutation.mutate({
      music: {
        ...(details?.music || {}),
        spotifyConnection: {
          accessToken:  pendingSpotifyData.at,
          refreshToken: pendingSpotifyData.rt,
          expiresAt:    pendingSpotifyData.exp,
          displayName:  pendingSpotifyData.name,
          imageUrl:     pendingSpotifyData.img,
        },
      },
    });
    toast.success(`Spotify connected — ${pendingSpotifyData.name}`);
    setPendingSpotifyData(null);
  }, [pendingSpotifyData, detailsLoaded]);

  useEffect(() => {
    if (!spotifyDropdownOpen) return;
    const handler = (e) => {
      if (spotifyPillRef.current && !spotifyPillRef.current.contains(e.target)) {
        setSpotifyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [spotifyDropdownOpen]);

  const updateMusic = (field, value) =>
    updateMutation.mutate({ music: { ...(details?.music || {}), [field]: value } });

  // ── Spotify helpers ───────────────────────────────────────────────────────
  const spotifyConnection  = details?.music?.spotifyConnection;
  const isSpotifyConnected = !!(spotifyConnection?.accessToken);

  const handleConnectSpotify = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      toast.error('Spotify is not configured — add VITE_SPOTIFY_CLIENT_ID to your environment.');
      return;
    }
    const redirectUri = 'https://www.openinvite.com.au/api/spotify-callback';
    const scope       = 'playlist-modify-public playlist-modify-private user-read-private';
    const state       = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('spotify_oauth_state', state);
    const params = new URLSearchParams({
      client_id:     clientId,
      response_type: 'code',
      redirect_uri:  redirectUri,
      scope,
      state,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  const handleDisconnectSpotify = () => {
    if (!window.confirm('Disconnect from Spotify?')) return;
    updateMusic('spotifyConnection', null);
    toast.success('Disconnected from Spotify');
  };

  const playlists = (details?.music?.playlists || []).filter(p => p.enabled);
  const pendingCount = (songRequests || []).filter(r => r.status === 'pending').length;
  const approvedCount = playlistTracks.filter(t => t.approved).length;
  const guestCount = playlistTracks.filter(t => t.guest_suggestion).length;

  const handleAddTrack = (track) => {
    const newTrack = { ...track, id: `${Date.now()}-${Math.random()}` };
    setPlaylistTracks(prev => [...prev, newTrack]);
    setShowSearch(false);
    setShowAddForm(false);
    toast.success('Track added');
  };

  const handleEditTrack = (track) => { setEditingTrack(track); setShowAddForm(true); setShowSearch(false); };
  const handleUpdateTrack = (updated) => {
    setPlaylistTracks(prev => prev.map(t => t.id === editingTrack.id ? { ...t, ...updated } : t));
    setEditingTrack(null); setShowAddForm(false);
    toast.success('Track updated');
  };
  const handleDeleteTrack = (id) => {
    if (!window.confirm('Remove this track?')) return;
    setPlaylistTracks(prev => prev.filter(t => t.id !== id));
  };
  const handleToggleApproval = (track) => {
    setPlaylistTracks(prev => prev.map(t => t.id === track.id ? { ...t, approved: !t.approved } : t));
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
          <button onClick={() => setShowSettings(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={12} />Settings
          </button>
        </div>
      </div>

      {/* Three-panel layout — horizontally scrollable on mobile */}
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
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                  No playlists yet. Create your first one below.
                </p>
              </div>
            )}
            {playlists.map(pl => (
              <div key={pl.id} onClick={() => setActivePlaylist(pl)}
                style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${activePlaylist?.id === pl.id ? '#E03553' : 'transparent'}`, background: activePlaylist?.id === pl.id ? 'rgba(224,53,83,0.05)' : 'transparent' }}>
                <div style={{ width: 32, height: 32, background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Music2 size={14} style={{ color: '#0A0A0A' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                    {playlistTracks.filter(t => t.category === pl.id).length} songs
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Add playlist */}
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, padding: '2px 0', width: '100%' }}>
                <Plus size={11} />Add playlist
              </button>
            )}
          </div>
        </div>

        {/* Center: Search + Tracks */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
          {/* Center header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{activePlaylist?.name || 'Select a playlist'}</p>
              <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                {playlistTracks.filter(t => t.category === activePlaylist?.id).length} songs
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowSearch(v => !v); setShowAddForm(false); setEditingTrack(null); }}
                className={showSearch ? 'btn-primary' : 'btn-editorial-secondary'}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={12} />Search & add
              </button>
              {isSpotifyConnected ? (
                <div style={{ position: 'relative' }} ref={spotifyPillRef}>
                  <button
                    onClick={() => setSpotifyDropdownOpen(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(29,185,84,0.08)', border: '1px solid rgba(29,185,84,0.25)', borderRadius: 999, padding: '5px 11px', cursor: 'pointer', fontSize: 12, fontFamily: PJS, fontWeight: 600, color: '#1DB954' }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1DB954', flexShrink: 0 }} />
                    Connected · {spotifyConnection.displayName}
                  </button>
                  {spotifyDropdownOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.12)', zIndex: 200, minWidth: 160 }}>
                      <button
                        onClick={() => setShowSpotifyModal(true)}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,10,10,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Search Spotify
                      </button>
                      <button
                        onClick={() => { setSpotifyDropdownOpen(false); handleDisconnectSpotify(); }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderTop: '1px solid rgba(10,10,10,0.06)', textAlign: 'left', fontSize: 13, fontFamily: PJS, color: '#E03553', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,53,83,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Disconnect Spotify
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnectSpotify}
                  className="btn-editorial-secondary"
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.469-.077-.336.132-.67.469-.746 3.809-.87 7.077-.496 9.713 1.115.293.18.386.563.207.856zm1.223-2.723c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.127-.848-.105-.975-.517-.127-.412.104-.848.517-.975 3.632-1.102 8.147-.568 11.238 1.33.366.225.48.706.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.624-.149-.495.13-1.016.625-1.166 3.532-1.073 9.404-.866 13.115 1.337.445.264.59.837.327 1.282-.264.444-.838.59-1.284.327z"/></svg>
                  Connect Spotify
                </button>
              )}
              <button onClick={() => { setShowAddForm(v => !v); setShowSearch(false); setEditingTrack(null); }}
                className="btn-editorial-secondary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={12} />Add manually
              </button>
            </div>
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
              onEdit={handleEditTrack}
              onDelete={handleDeleteTrack}
              onToggleApproval={handleToggleApproval}
            />
          </div>
        </div>

        {/* Right: Song Requests */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 10px' }}>Song requests</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {['pending', 'approved', 'declined'].map(status => (
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
              filteredRequests.map(req => (
                <div key={req.id} style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
                  <div style={{ display: 'flex', gap: 10, padding: 12 }}>
                    {req.albumArt && <img src={req.albumArt} style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} alt="" />}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>{/* end overflow-x-auto wrapper */}

      {/* Modals */}
      {showSuggestions && (
        <MusicSuggestionsModal isOpen={showSuggestions} onClose={() => setShowSuggestions(false)} onAddSuggestion={(s) => { handleAddTrack({ ...s, approved: true, guest_suggestion: false }); }} />
      )}
      {showShare && <SharePlaylist onClose={() => setShowShare(false)} playlistStats={playlistStats} />}
      {showSpotifyModal && (
        <SpotifyModal
          playlistId={activePlaylist?.id}
          spotifyConnection={spotifyConnection}
          onUpdateConnection={conn => updateMusic('spotifyConnection', conn)}
          onAdd={(track) => handleAddTrack({ ...track, category: activePlaylist?.id || 'general' })}
          onClose={() => setShowSpotifyModal(false)}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Song request settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Spotify connection */}
              {isSpotifyConnected && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 12, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 2px' }}>Spotify connected</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>{spotifyConnection.displayName}</p>
                  </div>
                  <button onClick={handleDisconnectSpotify} style={{ fontSize: 12, color: '#E03553', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, padding: 0 }}>
                    Disconnect
                  </button>
                </div>
              )}
              <ToggleRow label="Enable guest song requests" value={details?.music?.guestRequestsEnabled} onChange={v => updateMusic('guestRequestsEnabled', v)} />
              <ToggleRow label="Require approval before adding" value={details?.music?.requestsRequireApproval} onChange={v => updateMusic('requestsRequireApproval', v)} />
              <ToggleRow label="One request per guest" value={details?.music?.limitOnePerGuest} onChange={v => updateMusic('limitOnePerGuest', v)} />
              <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={labelStyle}>Message to guests</span>
                <Textarea value={details?.music?.requestMessage || ''} onChange={e => updateMusic('requestMessage', e.target.value)} placeholder="Tell guests about your song request policy…" />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSettings(false)} className="btn-primary" style={{ fontSize: 13 }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Music curator"
        systemPrompt="You are Ava, a wedding music curator. Help plan playlists, find songs, and coordinate music."
        quickActions={["Suggest first dance songs", "Build a reception playlist", "What songs to avoid?", "Ceremony music suggestions"]}
      />
    </div>
  );
}
