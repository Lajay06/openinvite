import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Music2, Plus, Sparkles, Share2, Settings, X, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import SpotifySearch from '../components/music/SpotifySearch';
import MusicSuggestionsModal from '../components/music/MusicSuggestionsModal';
import SharePlaylist from '../components/music/SharePlaylist';
import MusicList from '../components/music/MusicList';
import MusicForm from '../components/music/MusicForm';
import { Textarea } from '@/components/ui/textarea';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const DEFAULT_PLAYLISTS = [
  { id: 'ceremony',   name: 'Ceremony',      trackCount: 0, enabled: true },
  { id: 'cocktail',   name: 'Cocktail hour',  trackCount: 0, enabled: true },
  { id: 'reception',  name: 'Reception',      trackCount: 0, enabled: true },
  { id: 'dance',      name: 'Dance floor',    trackCount: 0, enabled: true },
  { id: 'requests',   name: 'Guest requests', trackCount: 0, enabled: true },
];

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

  const { data: details } = useQuery({
    queryKey: ['musicDetails'],
    queryFn: async () => { const r = await base44.entities.WeddingDetails.list(); return r[0] || null; },
  });

  const { data: songRequests } = useQuery({
    queryKey: ['songRequests'],
    queryFn: async () => { try { return await base44.entities.SongRequest.list(); } catch { return []; } },
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
    if (!details?.music?.playlists || details.music.playlists.length === 0) {
      updateMutation.mutate({ music: { ...details?.music, playlists: DEFAULT_PLAYLISTS } });
    }
    if (!activePlaylist && details?.music?.playlists?.length) {
      setActivePlaylist(details.music.playlists[0]);
    }
  }, [details]);

  const updateMusic = (field, value) =>
    updateMutation.mutate({ music: { ...(details?.music || {}), [field]: value } });

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
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Playlists', value: playlists.length },
          { label: 'Total songs', value: playlistTracks.length },
          { label: 'Song requests', value: songRequests?.length || 0 },
          { label: 'Pending approval', value: pendingCount, last: true },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: s.last ? 'none' : '1px solid rgba(10,10,10,0.08)' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to curate your playlist" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Toolbar */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowShare(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Share2 size={12} />Share playlist
        </button>
        <button onClick={() => setShowSettings(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={12} />Settings
        </button>
      </div>

      {/* Three-panel layout */}
      <div style={{ display: 'flex', height: 680, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {/* Left: Playlists */}
        <div style={{ width: 220, borderRight: '1px solid rgba(10,10,10,0.08)', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
            <span style={labelStyle}>Your playlists</span>
          </div>
          {playlists.map(pl => (
            <div key={pl.id} onClick={() => setActivePlaylist(pl)}
              style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${activePlaylist?.id === pl.id ? '#E03553' : 'transparent'}`, background: activePlaylist?.id === pl.id ? 'rgba(224,53,83,0.05)' : 'transparent' }}>
              <div style={{ width: 32, height: 32, background: '#0A1930', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Music2 size={14} style={{ color: '#DDF762' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</p>
                <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                  {playlistTracks.filter(t => t.category === pl.id).length} songs
                </p>
              </div>
            </div>
          ))}
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
                  style={{ flex: 1, padding: '5px 0', border: `1.5px solid ${requestFilter === status ? '#0A0A0A' : 'rgba(10,10,10,0.12)'}`, background: requestFilter === status ? '#0A0A0A' : 'transparent', color: requestFilter === status ? '#FFFFFF' : '#444444', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
                  {status}{status === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
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

      {/* Modals */}
      {showSuggestions && (
        <MusicSuggestionsModal isOpen={showSuggestions} onClose={() => setShowSuggestions(false)} onAddSuggestion={(s) => { handleAddTrack({ ...s, approved: true, guest_suggestion: false }); }} />
      )}
      {showShare && <SharePlaylist onClose={() => setShowShare(false)} playlistStats={playlistStats} />}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Song request settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
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
