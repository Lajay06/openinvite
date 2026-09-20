import React, { useState } from 'react';
import { Music2, Check, X, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Screen from '../../shell/Screen';
import { FilterPills, RowGroup, EmptyState, ErrorState, SkeletonRows, StatusPill, PillButton, SmartImage, PanelCard } from '../../ui';
import FormSheet from '../../features/FormSheet';
import { ENTITIES } from '../../features/schemas';
import { openExternal } from '../../native';

const SEGMENTS = [{ key: 'playlist', label: 'Playlist' }, { key: 'requests', label: 'Requests' }];
const STATUS = { pending: ['warn', 'To review'], approved: ['ok', 'Approved'], added: ['ok', 'On the playlist'], declined: ['no', 'Declined'] };

/**
 * Music: the playlist (Music records, add / edit / delete) and guest song
 * requests (approve adds to the playlist, decline; both through
 * /api/song-request-review as Music.jsx does).
 */
export default function MusicScreen({ tracks = [], requests = [], playlistUrl, onCreate, onUpdate, onDelete, onReview, loading, error, onRetry, back }) {
  const [params, setParams] = useSearchParams();
  const segment = params.get('segment') === 'requests' ? 'requests' : 'playlist';
  const [sheet, setSheet] = useState({ open: false, item: null });
  const [busy, setBusy] = useState(null);
  const schema = ENTITIES.music;
  const pending = requests.filter((r) => !r.status || r.status === 'pending');
  const review = async (r, action) => { setBusy(r.id); try { await onReview(r, action); } finally { setBusy(null); } };
  return (
    <Screen title="Music" subtitle={loading ? '' : pending.length ? `${pending.length} request${pending.length === 1 ? '' : 's'} to review` : `${tracks.length} track${tracks.length === 1 ? '' : 's'}`} back={back} actions={segment === 'playlist' ? [{ icon: Plus, label: 'Add track', onClick: () => setSheet({ open: true, item: null }) }] : []}>
      <FilterPills className="oi-m-segments" options={SEGMENTS.map((s) => ({ ...s, count: s.key === 'requests' && pending.length ? pending.length : undefined }))} value={segment} onChange={(k) => { params.set('segment', k); setParams(params, { replace: true }); }} />
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : segment === 'playlist' ? (
          <>
            {playlistUrl && <PanelCard tone="ink" label="Your playlist" title="Open on Spotify" action="Opens in the Spotify app or browser" onClick={() => openExternal(playlistUrl)} />}
            {tracks.length === 0 ? (
              <EmptyState icon={Music2} text="No tracks yet. Add the songs that matter, or approve a guest request." actionLabel="Add a track" onAction={() => setSheet({ open: true, item: null })} />
            ) : (
              <RowGroup>
                {tracks.map((t) => (
                  <button key={t.id} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => setSheet({ open: true, item: t })}>
                    {t.image_url ? <SmartImage src={t.image_url} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} /> : <span className="oi-m-row__tile oi-m-row__tile--ink"><Music2 size={18} strokeWidth={1.75} /></span>}
                    <div className="oi-m-row__body">
                      <div className="oi-m-row__label">{t.song_title}</div>
                      <div className="oi-m-row__sub">{[t.artist, t.category?.replace(/_/g, ' '), t.guest_suggestion ? 'guest request' : ''].filter(Boolean).join(' · ')}</div>
                    </div>
                  </button>
                ))}
              </RowGroup>
            )}
          </>
        ) : requests.length === 0 ? (
          <EmptyState icon={Music2} text="No requests yet. Guests can suggest songs from your site." />
        ) : (
          <RowGroup>
            {requests.map((r) => {
              const [tone, label] = STATUS[r.status || 'pending'] || STATUS.pending;
              const isPending = !r.status || r.status === 'pending';
              return (
                <div key={r.id} className="oi-m-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  {r.albumArt ? <SmartImage src={r.albumArt} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} /> : <span className="oi-m-row__tile"><Music2 size={18} strokeWidth={1.75} /></span>}
                  <div className="oi-m-row__body">
                    <div className="oi-m-row__label">{r.title}</div>
                    <div className="oi-m-row__sub">{[r.artist, r.submittedBy ? `from ${r.submittedBy}` : ''].filter(Boolean).join(' · ')}</div>
                    {r.guestNote && <div className="oi-m-meta" style={{ whiteSpace: 'normal', marginTop: 2 }}>{r.guestNote}</div>}
                  </div>
                  <StatusPill tone={tone}>{label}</StatusPill>
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, width: '100%', paddingLeft: 52 }}>
                      <PillButton variant="primary" size="sm" icon={Check} onClick={() => review(r, 'add')} disabled={busy === r.id}>Add</PillButton>
                      <PillButton variant="secondary" size="sm" icon={X} onClick={() => review(r, 'decline')} disabled={busy === r.id}>Decline</PillButton>
                    </div>
                  )}
                </div>
              );
            })}
          </RowGroup>
        )}
      </div>
      <FormSheet open={sheet.open} title={sheet.item ? 'Edit track' : 'Add track'} fields={schema.fields} initial={sheet.item} required={schema.required} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={async (v) => { if (sheet.item) await onUpdate(sheet.item.id, v); else await onCreate({ ...schema.defaults, ...v }); }} onDelete={sheet.item ? async () => { if (window.confirm('Remove this track?')) { await onDelete(sheet.item.id); setSheet({ open: false, item: null }); } } : undefined} saveLabel={sheet.item ? 'Save changes' : 'Add track'} />
    </Screen>
  );
}
