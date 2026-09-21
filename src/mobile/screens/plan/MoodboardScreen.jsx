import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Search, LayoutGrid, List as ListIcon, Download, ExternalLink, FolderOpen, Images } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { FilterPills, EmptyState, ErrorState, SkeletonRows, ItemCard, ItemList, SmartImage, StatusPill, useListView, BottomSheet, Row, RowGroup, TextField, PillButton, SearchScreen } from '../../ui';
import FormSheet from '../../features/FormSheet';
import { useConfirm } from '../../ui/ConfirmSheet';
import { imageUrl } from '../../images';
import { openExternal, exportText, isNative } from '../../native';
import { collectPhotoItems, buildManifestCsv, ZIP_BYTE_LIMIT } from '@/lib/photoExport';
import { validateUploadFile } from '@/lib/uploadValidation';
import { useApi } from '../../data/api';

/* Moodboard.jsx's categories and default boards, verbatim. */
export const MOODBOARD_CATEGORIES = ['venue', 'decor', 'flowers', 'dress', 'cake', 'colors', 'invitations', 'photography', 'hairstyle', 'makeup', 'centerpieces', 'lighting', 'other'];
const DEFAULT_BOARDS = ['Main board', 'Venue ideas', 'Dress inspiration', 'Color palette'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** AddItemModal's fields plus the edit modal's: title, photo, source, category, tags, notes. */
const FIELDS = [
  { name: 'title', label: 'Title', type: 'text', placeholder: 'Give your inspiration a title' },
  { name: 'image_url', label: 'Photo', type: 'image' },
  { name: 'source_url', label: 'Source link', type: 'url', placeholder: 'Where you found it' },
  { name: 'category', label: 'Category', type: 'select', options: MOODBOARD_CATEGORIES.map((c) => ({ value: c, label: cap(c) })) },
  { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'romantic, vintage, outdoor' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'What you love about this' },
];

/**
 * Moodboard: boards, search by title or tag, the category filter, a grid
 * or list of pins, add (camera, library or a link) and edit with every
 * desktop field, the large view with the source link, delete, and the
 * export (a zip on the web; natively the list of links, since the app has
 * no file store to hand a zip to).
 */
export default function MoodboardScreen({ items = [], coverPhoto, galleryPhotos = [], onCreate, onUpdate, onDelete, loading, error, onRetry, back, onRefresh, openAdd = false }) {
  const api = useApi();
  const multi = React.useRef(null);
  const [uploading, setUploading] = useState(0);
  // Moodboard.jsx's multi-file upload: every file is checked first, then each becomes a pin titled from its name.
  const uploadMany = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    for (const f of list) { const err = validateUploadFile(f, 'image'); if (err) { toast.error(`${f.name}: ${err}`); return; } }
    setUploading(list.length);
    let failed = 0;
    await Promise.all(list.map(async (f) => {
      try { const { file_url } = await api.upload(f); await onCreate({ title: f.name.split('.')[0], image_url: file_url, category: 'other', board_name: board, tags: [] }, { quiet: true }); }
      catch { failed += 1; }
      finally { setUploading((n) => n - 1); }
    }));
    if (failed) toast.error(`${failed} of ${list.length} failed to upload`); else toast.success(`${list.length} photo${list.length === 1 ? '' : 's'} pinned`);
  };
  const [board, setBoard] = useState('Main board');
  const [boards, setBoards] = useState(DEFAULT_BOARDS);
  const [category, setCategory] = useState('all');
  const [sheet, setSheet] = useState(openAdd ? { item: null } : null);
  const [view, setView] = useState(null); // an item, the large view
  const [boardSheet, setBoardSheet] = useState(false);
  const [newBoard, setNewBoard] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mode, setMode] = useListView('MoodboardItem', 'grid');
  const [confirm, confirmEl] = useConfirm();
  const allBoards = useMemo(() => [...new Set([...boards, ...items.map((i) => i.board_name).filter(Boolean)])], [boards, items]);
  const onBoard = useMemo(() => items.filter((i) => (i.board_name || 'Main board') === board), [items, board]);
  const visible = useMemo(() => onBoard.filter((i) => category === 'all' || i.category === category), [onBoard, category]);
  const results = useMemo(() => { const s = q.trim().toLowerCase(); return s ? items.filter((i) => i.title?.toLowerCase().includes(s) || (i.tags || []).some((t) => t.toLowerCase().includes(s))) : []; }, [items, q]);
  const cats = useMemo(() => ['all', ...MOODBOARD_CATEGORIES.filter((c) => onBoard.some((i) => i.category === c))], [onBoard]);
  const remove = async (it) => { if (!(await confirm({ title: 'Remove this pin', body: it.title, action: 'Remove' }))) return; await onDelete(it.id); setSheet(null); setView(null); };
  const exportBoard = async () => {
    // Moodboard.jsx exports the union: moodboard pins, the Photo gallery and the cover.
    const list = collectPhotoItems({ photos: galleryPhotos, moodboard: items, coverPhoto });
    if (!list.length) { toast.error('No photos to export yet'); return; }
    const manifest = buildManifestCsv(list);
    if (isNative()) { const r = await exportText('wedding-photos-list.csv', 'text/csv', manifest); if (r !== 'failed') toast.success(`${list.length} links shared as a list`); return; }
    const tid = toast.loading('Collecting your photos');
    try {
      const sizes = await Promise.all(list.map(async (i) => { try { const r = await fetch(i.url, { method: 'HEAD' }); return Number(r.headers.get('content-length') || 0); } catch { return 0; } }));
      if (sizes.reduce((a, b) => a + b, 0) > ZIP_BYTE_LIMIT) { await exportText('wedding-photos-list.csv', 'text/csv', manifest); toast.success('Too large to zip here; downloaded the list with every link instead.', { id: tid }); return; }
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file('photos.csv', manifest);
      let failed = 0;
      for (const item of list) { try { const res = await fetch(item.url); if (!res.ok) { failed++; continue; } zip.file(item.filename, await res.blob()); } catch { failed++; } }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'wedding-photos.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(failed ? `Exported ${list.length - failed} of ${list.length}` : `Exported ${list.length} photo${list.length === 1 ? '' : 's'}`, { id: tid });
    } catch { toast.error('Export failed. Try again.', { id: tid }); }
  };
  const openItem = (it) => setView(it);

  return (
    <>
      <Screen title="Moodboard" subtitle={loading ? '' : `${board}, ${onBoard.length} pin${onBoard.length === 1 ? '' : 's'}`} back={back} onRefresh={onRefresh} actions={[{ icon: Search, label: 'Search pins', onClick: () => setSearchOpen(true) }, { icon: Plus, label: 'Add pin', onClick: () => setSheet({ item: null }) }]}>
        <div className="oi-m-stack" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton variant="secondary" size="sm" icon={FolderOpen} onClick={() => setBoardSheet(true)} style={{ flex: 1, justifyContent: 'flex-start' }}>{board}</PillButton>
            <button type="button" className="oi-m-iconbtn" aria-label={mode === 'grid' ? 'Show as list' : 'Show as grid'} onClick={() => setMode(mode === 'grid' ? 'cards' : 'grid')}>{mode === 'grid' ? <ListIcon size={20} strokeWidth={1.75} /> : <LayoutGrid size={20} strokeWidth={1.75} />}</button>
          </div>
        </div>
        {cats.length > 1 && <FilterPills options={cats.map((c) => ({ key: c, label: c === 'all' ? 'All' : cap(c) }))} value={category} onChange={setCategory} />}
        <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 12 }}>
          {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : onBoard.length === 0 ? (
            <EmptyState icon={ImageIcon} image={imageUrl('emptyMoodboard')} text={items.length ? `Nothing on ${board} yet.` : 'Nothing pinned yet. Save the photos that feel right and a direction appears.'} actionLabel="Add a pin" onAction={() => setSheet({ item: null })} />
          ) : visible.length === 0 ? <EmptyState icon={ImageIcon} text="Nothing in this category." /> : mode === 'grid' ? (
            <div className="oi-m-imggrid">
              {visible.map((it) => (
                <button key={it.id} type="button" className="oi-m-imgcard oi-m-press" onClick={() => openItem(it)}>
                  <span className="oi-m-imgcard__badge"><StatusPill tone="light">{cap(it.category || 'other')}</StatusPill></span>
                  <SmartImage src={it.image_url} alt={it.title} width={170} ratio="1/1" tone={it.image_url ? 'neutral' : 'tint'} />
                  <div className="oi-m-imgcard__body"><div className="oi-m-imgcard__title">{it.title || 'Untitled'}</div></div>
                </button>
              ))}
            </div>
          ) : (
            <ItemList>
              {visible.map((it) => <ItemCard key={it.id} image={it.image_url} alt={it.title} icon={ImageIcon} title={it.title || 'Untitled'} meta={[cap(it.category || 'other'), (it.tags || []).join(', ')].filter(Boolean).join(', ')} onClick={() => openItem(it)} />)}
            </ItemList>
          )}
          {!loading && !error && (
            <>
              <input ref={multi} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { uploadMany(e.target.files); e.target.value = ''; }} />
              <RowGroup><Row icon={Images} tile="neutral" label={uploading ? `Uploading ${uploading}` : 'Add several photos at once'} sub={`Each becomes a pin on ${board}, titled from its file name`} onClick={() => multi.current?.click()} chevron={false} /></RowGroup>
            </>
          )}
          {!loading && items.length > 0 && <RowGroup><Row icon={Download} tile="neutral" label="Export the photos" sub={isNative() ? 'A list with every link, through the share sheet' : 'A zip with every photo and a list'} onClick={exportBoard} chevron={false} /></RowGroup>}
        </div>
      </Screen>
      <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by title or tag">
        {q.trim() === '' ? <p className="oi-m-meta" style={{ padding: 16 }}>Search every board by title or tag.</p> : results.length === 0 ? <p className="oi-m-meta" style={{ padding: 16 }}>Nothing matches that.</p> : <div className="oi-m-stack"><ItemList>{results.map((it) => <ItemCard key={it.id} image={it.image_url} alt={it.title} icon={ImageIcon} title={it.title || 'Untitled'} meta={it.board_name || 'Main board'} onClick={() => { setSearchOpen(false); setQ(''); if (it.board_name) setBoard(it.board_name); openItem(it); }} />)}</ItemList></div>}
      </SearchScreen>
      <BottomSheet open={boardSheet} onClose={() => setBoardSheet(false)} title="Boards">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RowGroup>{allBoards.map((b) => <Row key={b} icon={FolderOpen} tile={b === board ? 'primary' : 'neutral'} label={b} sub={`${items.filter((i) => (i.board_name || 'Main board') === b).length} pins`} onClick={() => { setBoard(b); setBoardSheet(false); }} chevron={false} />)}</RowGroup>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><TextField label="New board" value={newBoard} onChange={(e) => setNewBoard(e.target.value)} placeholder="Reception styling" autoCapitalize="words" /></div>
            <PillButton variant="primary" size="sm" disabled={!newBoard.trim()} onClick={() => { const n = newBoard.trim(); if (!allBoards.includes(n)) setBoards((l) => [...l, n]); setBoard(n); setNewBoard(''); setBoardSheet(false); }}>Create</PillButton>
          </div>
        </div>
      </BottomSheet>
      {view && (
        <BottomSheet open onClose={() => setView(null)} title={view.title || 'Untitled'} full footer={(
          <>
            <PillButton variant="ghost" onClick={() => remove(view)} style={{ color: 'var(--m-primary)' }}>Remove</PillButton>
            {view.source_url && <PillButton variant="secondary" icon={ExternalLink} onClick={() => openExternal(view.source_url)}>Source</PillButton>}
            <PillButton variant="primary" style={{ flex: 1 }} onClick={() => { setSheet({ item: view }); setView(null); }}>Edit</PillButton>
          </>
        )}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SmartImage src={view.image_url} alt={view.title} width={350} ratio="1/1" eager />
            <div className="oi-m-meta">{[cap(view.category || 'other'), view.board_name || 'Main board'].join(', ')}</div>
            {view.notes && <p className="oi-m-body">{view.notes}</p>}
            {(view.tags || []).length > 0 && <div className="oi-m-choices">{view.tags.map((t) => <span key={t} className="oi-m-filter">{t}</span>)}</div>}
          </div>
        </BottomSheet>
      )}
      {sheet && (
        <FormSheet open full title={sheet.item ? 'Edit pin' : 'Add a pin'} fields={FIELDS} initial={sheet.item || { category: 'other' }} required={['title', 'image_url']} onClose={() => setSheet(null)}
          onSave={async (v) => { if (sheet.item) await onUpdate(sheet.item.id, v); else await onCreate({ ...v, board_name: board }); }}
          onDelete={sheet.item ? () => remove(sheet.item) : undefined} saveLabel={sheet.item ? 'Save' : 'Add pin'} />
      )}
      {confirmEl}
    </>
  );
}
