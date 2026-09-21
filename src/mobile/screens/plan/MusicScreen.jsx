import React, { useEffect, useMemo, useState } from 'react';
import { Music2, Check, X, Plus, Share2, Settings2, ExternalLink, Store, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { FilterPills, RowGroup, EmptyState, ErrorState, SkeletonRows, StatusPill, PillButton, SmartImage, PanelCard, BottomSheet, TextField, TextAreaField, Switch } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { ENTITIES } from '../../features/schemas';
import { openExternal, shareLink } from '../../native';
import { parsePlaylistLink } from '@/lib/musicLinkParser';
import { DEFAULT_MUSIC_REQUEST_MESSAGE } from '@/lib/musicCopy';

const SEGMENTS = [{ key: 'requests', label: 'Requests' }, { key: 'playlist', label: 'Playlist' }, { key: 'notes', label: 'Notes' }, { key: 'vendor', label: 'Vendor' }];
const STATUS = { pending: ['warn', 'Pending'], approved: ['ok', 'Approved'], added: ['ok', 'On the playlist'], declined: ['no', 'Declined'] };
/* Music.jsx: 'all' is a view, the four statuses are what can be written. */
const REQUEST_STATUSES = ['pending', 'approved', 'declined', 'added'];
const STATUS_LABELS = { all: 'All', pending: 'Pending', approved: 'Approved', declined: 'Declined', added: 'On the playlist' };

/**
 * Music, as Music.jsx: guest song requests with the five filters and
 * Approve, Add to the playlist and Decline (all through
 * /api/song-request-review), the playlist link (Spotify, Apple Music or
 * YouTube, parsed for its source), the Settings sheet (guest requests on
 * or off, approval, one per guest, the message guests see), Share (the
 * site's music page, a QR), Notes, and the vendor roster. The Music
 * entity tracks (add, edit, delete) stay as the phone's own playlist editor.
 */
export default function MusicScreen({ tracks = [], requests = [], settings = {}, playlistUrl = '', shareUrl = '', onPlaylistUrl, onSettings, onCreate, onUpdate, onDelete, onReview, onOpenVendors, loading, error, onRetry, back, onRefresh }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [sheet, setSheet] = useState({ open: false, item: null });
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [link, setLink] = useState(playlistUrl || '');
  const [notes, setNotes] = useState(settings.notes || '');
  const notesTimer = React.useRef(null);
  const [confirm, confirmEl] = useConfirm();
  useEffect(() => { setLink(playlistUrl || ''); }, [playlistUrl]);
  useEffect(() => { setNotes(settings.notes || ''); }, [settings.notes]);
  useEffect(() => () => clearTimeout(notesTimer.current), []);
  const schema = ENTITIES.music;
  const counts = useMemo(() => ({ all: requests.length, ...Object.fromEntries(REQUEST_STATUSES.map((k) => [k, requests.filter((r) => (r.status || 'pending') === k).length])) }), [requests]);
  const visible = requests.filter((r) => filter === 'all' || (r.status || 'pending') === filter);
  const pending = counts.pending;
  const review = async (r, action) => { setBusy(r.id); try { await onReview(r, action); } finally { setBusy(null); } };
  const source = link ? parsePlaylistLink(link)?.sourceLabel || null : null;
  const saveLink = async () => { const next = link.trim(); if (next === (playlistUrl || '')) return; await onPlaylistUrl(next); };
  const queueNotes = (v) => { setNotes(v); clearTimeout(notesTimer.current); notesTimer.current = setTimeout(() => onSettings({ notes: v }, { quiet: true }), 900); };
  const actions = [{ icon: Share2, label: 'Share the playlist', onClick: () => setShareOpen(true) }, { icon: Settings2, label: 'Song request settings', onClick: () => setSettingsOpen(true) }];
  const subtitle = loading ? '' : pending ? `${pending} request${pending === 1 ? '' : 's'} to review` : `${requests.length} request${requests.length === 1 ? '' : 's'}, ${tracks.length} track${tracks.length === 1 ? '' : 's'}`;

  return (
    <Screen title="Music" subtitle={subtitle} back={back} actions={actions} onRefresh={onRefresh}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'requests' && <FilterPills options={['all', ...REQUEST_STATUSES].map((k) => ({ key: k, label: STATUS_LABELS[k], count: counts[k] }))} value={filter} onChange={setFilter} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: segment === 'requests' ? 16 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : segment === 'requests' ? (
          requests.length === 0 ? (
            <EmptyState icon={Music2} text={!settings.guestRequestsEnabled ? 'Song requests are switched off. Turn them on under settings and guests can suggest songs from your site.' : 'No requests yet. Guests can suggest songs from your site.'} />
          ) : visible.length === 0 ? <EmptyState icon={Music2} text="Nothing here for this filter." /> : (
            <RowGroup>
              {visible.map((r) => {
                const [tone, label] = STATUS[r.status || 'pending'] || STATUS.pending;
                const st = r.status || 'pending';
                return (
                  <div key={r.id} className="oi-m-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    {r.albumArt ? <SmartImage src={r.albumArt} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} /> : <span className="oi-m-row__tile"><Music2 size={18} strokeWidth={1.75} /></span>}
                    <div className="oi-m-row__body">
                      <div className="oi-m-row__label">{r.title}</div>
                      <div className="oi-m-row__sub">{[r.artist, r.submittedBy ? `from ${r.submittedBy}` : ''].filter(Boolean).join(', ')}</div>
                      {r.guestNote && <div className="oi-m-meta" style={{ whiteSpace: 'normal', marginTop: 2 }}>{r.guestNote}</div>}
                    </div>
                    <StatusPill tone={tone}>{label}</StatusPill>
                    {(st === 'pending' || st === 'approved') && (
                      <div style={{ display: 'flex', gap: 8, width: '100%', paddingLeft: 52, flexWrap: 'wrap' }}>
                        {st === 'pending' && <PillButton variant="primary" size="sm" icon={Check} onClick={() => review(r, 'approve')} disabled={busy === r.id}>Approve</PillButton>}
                        <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => review(r, 'add')} disabled={busy === r.id}>Add to playlist</PillButton>
                        <PillButton variant="secondary" size="sm" icon={X} onClick={() => review(r, 'decline')} disabled={busy === r.id}>Decline</PillButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </RowGroup>
          )
        ) : segment === 'playlist' ? (
          <>
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Your playlist</h2>
              <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p className="oi-m-meta">Paste a link to your playlist on Spotify, Apple Music or YouTube. Guests see it on your site.</p>
                <TextField label="Playlist link" type="url" inputMode="url" autoCapitalize="off" value={link} onChange={(e) => setLink(e.target.value)} onBlur={saveLink} placeholder="https://open.spotify.com/playlist/..." error={link && !source ? 'That does not look like a Spotify, Apple Music or YouTube link.' : ''} />
                {link && source && <PillButton variant="secondary" size="sm" icon={ExternalLink} onClick={() => openExternal(link)} style={{ alignSelf: 'flex-start' }}>Open on {source}</PillButton>}
              </div>
            </section>
            <section>
              <div className="oi-m-section-head">
                <h2 className="oi-m-section">Your tracks</h2>
                <button type="button" className="oi-m-block__link" onClick={() => setSheet({ open: true, item: null })}>Add track</button>
              </div>
              {tracks.length === 0 ? (
                <EmptyState icon={Music2} text="No tracks yet. Add the songs that matter, or add a guest request to the playlist." actionLabel="Add a track" onAction={() => setSheet({ open: true, item: null })} />
              ) : (
                <RowGroup>
                  {tracks.map((t) => (
                    <button key={t.id} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => setSheet({ open: true, item: t })}>
                      {t.image_url ? <SmartImage src={t.image_url} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} /> : <span className="oi-m-row__tile oi-m-row__tile--ink"><Music2 size={18} strokeWidth={1.75} /></span>}
                      <div className="oi-m-row__body">
                        <div className="oi-m-row__label">{t.song_title}</div>
                        <div className="oi-m-row__sub">{[t.artist, t.category?.replace(/_/g, ' '), t.guest_suggestion ? 'guest request' : ''].filter(Boolean).join(', ')}</div>
                      </div>
                    </button>
                  ))}
                </RowGroup>
              )}
            </section>
          </>
        ) : segment === 'notes' ? (
          <div className="oi-m-card">
            <TextAreaField label="Notes" value={notes} onChange={(e) => queueNotes(e.target.value)} rows={6} placeholder="Anything else about your music plans: must-plays, timing notes, vendor coordination" />
          </div>
        ) : (
          <PanelCard tone="neutral" label="Music vendors" title="Your DJ, band and musicians" body="Everyone in the music category of My vendors, with their status and contact." action="Open My vendors" onClick={() => onOpenVendors('music')}><Store size={18} style={{ opacity: 0.6 }} /></PanelCard>
        )}
      </div>
      <FormSheet open={sheet.open} title={sheet.item ? 'Edit track' : 'Add track'} fields={schema.fields} initial={sheet.item} required={schema.required} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={async (v) => { if (sheet.item) await onUpdate(sheet.item.id, v); else await onCreate({ ...schema.defaults, ...v }); }} onDelete={sheet.item ? async () => { if (await confirm({ title: 'Remove this track', body: sheet.item.song_title, action: 'Remove' })) { await onDelete(sheet.item.id); setSheet({ open: false, item: null }); } } : undefined} saveLabel={sheet.item ? 'Save changes' : 'Add track'} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={onSettings} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl} />
      {confirmEl}
    </Screen>
  );
}

/** Music.jsx's SettingsModal. */
function SettingsSheet({ open, onClose, settings, onSave }) {
  const [v, setV] = useState({});
  useEffect(() => { if (open) setV({ guestRequestsEnabled: !!settings.guestRequestsEnabled, requestsRequireApproval: !!settings.requestsRequireApproval, limitOnePerGuest: !!settings.limitOnePerGuest, requestMessage: settings.requestMessage ?? DEFAULT_MUSIC_REQUEST_MESSAGE }); }, [open, settings]);
  const [saving, setSaving] = useState(false);
  const rows = [['guestRequestsEnabled', 'Enable guest song requests'], ['requestsRequireApproval', 'Require approval before adding'], ['limitOnePerGuest', 'One request per guest']];
  return (
    <BottomSheet open={open} onClose={onClose} title="Song requests" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" style={{ flex: 1 }} disabled={saving} onClick={async () => { setSaving(true); try { await onSave(v); onClose(); } finally { setSaving(false); } }}>{saving ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <RowGroup>
          {rows.map(([k, label]) => <div key={k} className="oi-m-row"><div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{label}</div></div><Switch on={!!v[k]} onChange={(on) => setV((s) => ({ ...s, [k]: on }))} label={label} /></div>)}
        </RowGroup>
        <TextAreaField label="What guests see above the song search" value={v.requestMessage || ''} onChange={(e) => setV((s) => ({ ...s, requestMessage: e.target.value }))} rows={3} />
      </div>
    </BottomSheet>
  );
}

/** SharePlaylist.jsx: the site's music page, with a QR drawn locally. */
function ShareSheet({ open, onClose, url }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!open || !url) return;
    let alive = true;
    import('qrcode').then((qr) => qr.toString(url, { type: 'svg', margin: 1, width: 180, color: { dark: '#0A0A0A', light: '#FFFFFF' } })).then((s) => { if (alive) setSvg(s); }).catch(() => {});
    return () => { alive = false; };
  }, [open, url]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Share with guests">
      {!url ? <p className="oi-m-body">Your site has no address yet, so there is no link to share until then.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <p className="oi-m-meta" style={{ alignSelf: 'stretch' }}>Guests open this page to see the playlist and suggest songs.</p>
          {svg && <div style={{ width: 180, height: 180, borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR code for the playlist page" role="img" />}
          <div className="oi-m-meta" style={{ overflowWrap: 'anywhere', textAlign: 'center' }}>{url.replace(/^https?:\/\//, '')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton variant="secondary" icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied'); } catch { toast.error('Could not copy'); } }}>Copy link</PillButton>
            <PillButton variant="primary" icon={Share2} onClick={async () => { const r = await shareLink({ title: 'Our wedding playlist', text: 'Suggest a song for the dance floor.', url }); if (r === 'copied') toast.success('Link copied'); }}>Share</PillButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

