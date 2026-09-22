import React, { useMemo, useRef, useState } from 'react';
import { Plus, Store, Search, Star, Phone, Mail, Globe, MapPin, LayoutGrid, List as ListIcon, MessageSquare, FileText, CheckSquare, Trash2, Pencil, Upload, PhoneCall, Users, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { useConsiderations } from '../../features/ConsiderationsSheet';

import { FilterPills, EmptyState, ErrorState, SkeletonRows, ItemCard, ItemList, SmartImage, StatusPill, useListView, SearchScreen, RowGroup, Row, PillButton, BottomSheet, SelectField, TextField, TextAreaField, Checkbox } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { vendorFields, vendorPayload, vendorInitial, VENDOR_CATEGORIES, VENDOR_STATUSES } from '../../features/vendorFields';
import { imageUrl } from '../../images';
import { openExternal } from '../../native';
import { VENDOR_STATUS_LABEL, VENDOR_STATUS_TONE, money, dateShort } from '../../lib/format';

/* Vendors.jsx's filter lists, verbatim (its category labels differ from the form's on purpose there too). */
const STATUS_FILTERS = [['all', 'All statuses'], ['favorites', 'Favorites'], ['booked', 'Booked'], ['contacted', 'Contacted'], ['meeting_scheduled', 'Meeting scheduled'], ['quoted', 'Quoted'], ['rejected', 'Rejected'], ['researching', 'Researching']];
/** VendorList.jsx's sortable columns; blanks sort last whatever the direction. */
const SORTS = [{ value: 'added', label: 'Newest first' }, { value: 'name', label: 'Name' }, { value: 'category', label: 'Category' }, { value: 'status', label: 'Status' }, { value: 'cost', label: 'Price' }];
const STATUS_RANK = { booked: 0, quoted: 1, meeting_scheduled: 2, contacted: 3, researching: 4, rejected: 5 };
function sortVendors(list, key, dir) {
  if (key === 'added') return list;
  const get = { name: (v) => v.name || '', category: (v) => CATEGORY_LABEL[v.category] || v.category || '', status: (v) => (v.status ? STATUS_RANK[v.status] ?? 5 : null), cost: (v) => v.quoted_price ?? null }[key];
  const cmp = key === 'name' || key === 'category' ? (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' }) : (a, b) => a - b;
  const d = dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => { const va = get(a); const vb = get(b); const ab = va === '' || va == null; const bb = vb === '' || vb == null; if (ab && bb) return 0; if (ab) return 1; if (bb) return -1; return cmp(va, vb) * d; });
}
const CATEGORY_FILTERS = [['all', 'All categories'], ['venue', 'Venue'], ['catering', 'Catering'], ['photography', 'Photography'], ['videography', 'Videography'], ['flowers', 'Florals'], ['attire', 'Styling'], ['beauty', 'Hair & makeup'], ['music', 'Music & DJ'], ['transportation', 'Transport'], ['planning', 'Celebrant'], ['other', 'Other']];
const CATEGORY_LABEL = Object.fromEntries(VENDOR_CATEGORIES.map((c) => [c.value, c.label]));
const STATUS_LABEL = Object.fromEntries(VENDOR_STATUSES.map((s) => [s.value, s.label]));

/**
 * My vendors, as Vendors.jsx: stats, search, the status and category
 * filters, the favorite star, cards or a grid, add and edit with the full
 * VendorForm (the photo and video fields for those two categories), and
 * a vendor screen with communications, documents and tasks.
 */
export default function VendorsScreen({ notice, items = [], symbol = '$', initialCategory = 'all', onCreate, onUpdate, onDelete, onOpen, onToggleFavorite, loading, error, onRetry, back, onRefresh, openAdd = false }) {
  const [sort, setSort] = useState({ key: 'added', dir: 'asc' });
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState(initialCategory);
  const [sheet, setSheet] = useState(openAdd ? { item: null } : null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [view, setView] = useListView('Vendor', 'cards');
  const considerations = useConsiderations('vendors');
  const visible = useMemo(() => sortVendors(items.filter((v) => (status === 'all' || (status === 'favorites' ? !!v.is_favourite : v.status === status)) && (category === 'all' || v.category === category)), sort.key, sort.dir), [items, status, category, sort]);
  const results = useMemo(() => { const s = q.trim().toLowerCase(); return s ? items.filter((v) => [v.name, v.contact_person, v.category, v.email].some((x) => (x || '').toLowerCase().includes(s))) : []; }, [items, q]);
  const booked = items.filter((v) => v.status === 'booked').length;
  const quoted = items.filter((v) => v.status === 'quoted').length; // Vendors.jsx counts quotes, it does not sum them
  const researching = items.filter((v) => v.status === 'researching').length;
  const card = (v) => <ItemCard key={v.id} icon={Store} tile={v.is_favourite ? 'tint' : 'neutral'} action={onToggleFavorite ? { icon: Star, label: v.is_favourite ? `Remove ${v.name} from favorites` : `Add ${v.name} to favorites`, tone: v.is_favourite ? 'primary' : 'neutral', onClick: () => onToggleFavorite(v) } : undefined} title={v.name} meta={[CATEGORY_LABEL[v.category] || v.category, v.contact_person].filter(Boolean).join(', ')} value={v.quoted_price ? money(v.quoted_price, symbol) : ''} badge={VENDOR_STATUS_LABEL[v.status] || STATUS_LABEL[v.status] || v.status} badgeTone={VENDOR_STATUS_TONE[v.status] || 'neutral'} onClick={() => onOpen(v)} action={v.phone ? { icon: Phone, label: `Call ${v.name}`, onClick: () => openExternal(`tel:${v.phone}`) } : undefined} />;
  return (
    <>
      <Screen notice={notice} title="My vendors" subtitle={loading ? '' : `${items.length} vendor${items.length === 1 ? '' : 's'}: ${booked} booked, ${quoted} quoted, ${researching} researching`} back={back} onRefresh={onRefresh} actions={[{ icon: Search, label: 'Search vendors', onClick: () => setSearchOpen(true) }, { icon: Plus, label: 'Add vendor', onClick: () => setSheet({ item: null }) }]}>
        <FilterPills options={STATUS_FILTERS.map(([key, label]) => ({ key, label, count: key === 'all' ? undefined : items.filter((v) => v.status === key).length }))} value={status} onChange={setStatus} />
        <div style={{ marginTop: 8 }}><FilterPills options={CATEGORY_FILTERS.filter(([k]) => k === 'all' || items.some((v) => v.category === k)).map(([key, label]) => ({ key, label }))} value={category} onChange={setCategory} /></div>
        <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 12 }}>
          {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : items.length === 0 ? (
            <EmptyState icon={Store} image={imageUrl('emptyVendors')} text="No vendors yet. Add the ones you are talking to, or find them in the marketplace." actionLabel="Add a vendor" onAction={() => setSheet({ item: null })} />
          ) : visible.length === 0 ? <EmptyState icon={Store} text="No vendors match these filters." /> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><SelectField label="Sort" value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'asc' })} options={SORTS} /></div>
                  {sort.key !== 'added' && <button type="button" className="oi-m-iconbtn" aria-label={sort.dir === 'asc' ? 'Sort descending' : 'Sort ascending'} onClick={() => setSort((x) => ({ ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' }))}>{sort.dir === 'asc' ? <ArrowDown size={20} strokeWidth={1.75} /> : <ArrowUp size={20} strokeWidth={1.75} />}</button>}
                </div>
                <button type="button" className="oi-m-iconbtn" aria-label={view === 'grid' ? 'Show as list' : 'Show as grid'} onClick={() => setView(view === 'grid' ? 'cards' : 'grid')}>{view === 'grid' ? <ListIcon size={20} strokeWidth={1.75} /> : <LayoutGrid size={20} strokeWidth={1.75} />}</button>
              </div>
              {view === 'grid' ? (
                <div className="oi-m-imggrid">
                  {visible.map((v) => (
                    <button key={v.id} type="button" className="oi-m-imgcard oi-m-press" onClick={() => onOpen(v)}>
                      <span className="oi-m-imgcard__badge"><StatusPill tone={v.status === 'booked' ? 'ok' : 'light'}>{VENDOR_STATUS_LABEL[v.status] || v.status}</StatusPill></span>
                      <SmartImage src={String(v.sample_work || '').split(/\n/).map((x) => x.trim()).find((x) => /^https?:\/\//.test(x)) || ''} alt={v.name} width={170} ratio="1/1" tone="tint" />
                      <div className="oi-m-imgcard__body"><div className="oi-m-imgcard__title">{v.name}</div></div>
                    </button>
                  ))}
                </div>
              ) : <ItemList>{visible.map(card)}</ItemList>}
            </>
          )}
          {!loading && !error && considerations.row}
        </div>
      </Screen>
      {considerations.sheet}
      <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by name, contact or category">
        {q.trim() === '' ? <p className="oi-m-meta" style={{ padding: 16 }}>Start typing to search your vendors.</p> : results.length === 0 ? <p className="oi-m-meta" style={{ padding: 16 }}>No vendors match that.</p> : <div className="oi-m-stack"><ItemList>{results.map((v) => <ItemCard key={v.id} icon={Store} tile="neutral" title={v.name} meta={CATEGORY_LABEL[v.category] || v.category} onClick={() => { setSearchOpen(false); setQ(''); onOpen(v); }} />)}</ItemList></div>}
      </SearchScreen>
      {sheet && <VendorFormSheet item={sheet.item} onClose={() => setSheet(null)} onSave={async (v) => { if (sheet.item) await onUpdate(sheet.item.id, v); else await onCreate(v); }} onDelete={sheet.item ? async () => { await onDelete(sheet.item); setSheet(null); } : undefined} />}
    </>
  );
}

export function VendorFormSheet({ item, defaultCategory = '', onClose, onSave, onDelete }) {
  const fields = useMemo(() => vendorFields(), []);
  return <FormSheet open full title={item ? 'Edit vendor' : 'Add vendor'} fields={fields} initial={vendorInitial(item) || { category: defaultCategory, status: 'researching' }} required={['name', 'category']} onClose={onClose} onSave={(v) => onSave(vendorPayload(v))} onDelete={onDelete} saveLabel={item ? 'Save' : 'Add vendor'} deleteLabel="Delete" />;
}

/* ── The vendor screen: VendorDetailPanel.jsx's three tabs, plus the record ── */
const TABS = [{ key: 'about', label: 'About' }, { key: 'comms', label: 'Communications' }, { key: 'docs', label: 'Documents' }, { key: 'tasks', label: 'Tasks' }];
const LOG_TYPES = [['email', 'Email'], ['call', 'Call'], ['meeting', 'Meeting'], ['note', 'Note']].map(([value, label]) => ({ value, label }));
const DOC_TYPES = ['contract', 'invoice', 'quote', 'receipt', 'other'].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
const LOG_ICON = { email: Mail, call: PhoneCall, meeting: Users, note: MessageSquare, document: FileText };

export function VendorDetailScreen({ notice, vendor, logs = [], tasks = [], symbol = '$', onEdit, onDelete, onToggleFavourite, onAddLog, onDeleteLog, onUpload, onAddTask, onToggleTask, onDeleteTask, loading, error, onRetry, back }) {
  const [tab, setTab] = useSegment(TABS);
  const [logSheet, setLogSheet] = useState(null); // 'log' | 'doc'
  const [taskSheet, setTaskSheet] = useState(false);
  const [confirm, confirmEl] = useConfirm();
  if (loading) return <Screen title="Vendor" back={back}><div className="oi-m-stack"><SkeletonRows count={5} /></div></Screen>;
  if (error) return <Screen title="Vendor" back={back}><div className="oi-m-stack"><ErrorState onRetry={onRetry} /></div></Screen>;
  if (!vendor) return <Screen title="Vendor" back={back}><div className="oi-m-stack"><p className="oi-m-body">This vendor is not on your list any more.</p></div></Screen>;
  const comms = logs.filter((l) => l.type !== 'document');
  const docs = logs.filter((l) => l.type === 'document');
  const done = tasks.filter((t) => t.completed).length;
  const kv = (k, v) => (v != null && v !== '' && v !== false ? <div className="oi-m-kv" key={k}><div className="oi-m-kv__k">{k}</div><div className="oi-m-kv__v">{v === true ? 'Yes' : String(v)}</div></div> : null);
  const isPhoto = vendor.category === 'photography' || vendor.category === 'videography';
  return (
    <Screen notice={notice} title={vendor.name} subtitle={[CATEGORY_LABEL[vendor.category] || vendor.category, VENDOR_STATUS_LABEL[vendor.status] || vendor.status].filter(Boolean).join(', ')} back={back} actions={[{ icon: Star, label: vendor.is_favourite ? 'Remove from favorites' : 'Add to favorites', onClick: onToggleFavourite }, { icon: Pencil, label: 'Edit vendor', onClick: onEdit }]}>
      <Segments options={TABS.map((t) => (t.key === 'tasks' ? { ...t, label: `Tasks ${done}/${tasks.length}` } : t))} value={tab} onChange={setTab} />
      <div className="oi-m-stack oi-m-stack--24">
        {tab === 'about' && (
          <>
            <RowGroup>
              {vendor.phone && <Row icon={Phone} tile="neutral" label={vendor.phone} sub="Call" onClick={() => openExternal(`tel:${vendor.phone}`)} chevron={false} />}
              {vendor.email && <Row icon={Mail} tile="neutral" label={vendor.email} sub="Email" onClick={() => openExternal(`mailto:${vendor.email}`)} chevron={false} />}
              {vendor.website && <Row icon={Globe} tile="neutral" label={vendor.website.replace(/^https?:\/\//, '')} sub="Website" onClick={() => openExternal(vendor.website)} chevron={false} />}
              {vendor.address && <Row icon={MapPin} tile="neutral" label={vendor.address} sub="Open in Maps" onClick={() => openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendor.address)}`)} chevron={false} />}
              {!vendor.phone && !vendor.email && !vendor.website && !vendor.address && <Row icon={Store} tile="neutral" label="No contact details yet" sub="Edit to add a phone, email or website" onClick={onEdit} />}
            </RowGroup>
            <div className="oi-m-card oi-m-card--flush">
              {kv('Contact', vendor.contact_person)}
              {kv('Meeting', vendor.meeting_date ? new Date(vendor.meeting_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '')}
              {kv('Status', VENDOR_STATUS_LABEL[vendor.status] || vendor.status)}
              {kv('Quote', vendor.quoted_price ? money(vendor.quoted_price, symbol) : '')}
              {kv('Deposit', vendor.deposit_amount ? `${money(vendor.deposit_amount, symbol)}${vendor.deposit_paid ? ', paid' : ', not paid'}` : vendor.deposit_paid ? 'Paid' : '')}
              {kv('Contract', vendor.contract_signed ? `Signed${vendor.contract_date ? ` ${dateShort(vendor.contract_date)}` : ''}` : vendor.contract_date ? dateShort(vendor.contract_date) : '')}
              {kv('Price range', vendor.price_range)}
              {kv('Rating', vendor.rating ? `${vendor.rating} of 5` : '')}
              {kv('Payment schedule', vendor.payment_schedule)}
              {kv('Google rating', vendor.google_rating ? `${vendor.google_rating} (${vendor.google_reviews_count || 0} reviews)` : '')}
              {kv('Notes', vendor.notes)}
              {isPhoto && kv('Instagram', vendor.instagram)}
              {isPhoto && kv('Package', vendor.package_selected)}
              {isPhoto && kv('Hours booked', vendor.hours_booked)}
              {isPhoto && kv('Booking date', vendor.booking_date ? dateShort(vendor.booking_date) : '')}
              {isPhoto && kv('On the day', vendor.start_time && vendor.end_time ? `${vendor.start_time} to ${vendor.end_time}` : vendor.start_time)}
              {isPhoto && kv('Style', Array.isArray(vendor.style) ? vendor.style.join(', ') : vendor.style)}
              {isPhoto && kv('Portfolio', vendor.portfolio_url)}
              {isPhoto && kv('Services', Array.isArray(vendor.services_offered) ? vendor.services_offered.join(', ') : vendor.services_offered)}
              {isPhoto && kv('Delivery', vendor.delivery_timeline)}
              {isPhoto && kv('Images', vendor.image_count)}
              {isPhoto && kv('Video', vendor.video_length)}
              {isPhoto && kv('Editing', vendor.editing_style)}
              {isPhoto && kv('Travel fee', vendor.travel_fee ? money(vendor.travel_fee, symbol) : '')}
              {isPhoto && kv('Second shooter', vendor.second_shooter)}
              {isPhoto && kv('Backup equipment', vendor.backup_equipment)}
              {isPhoto && kv('Cancellation policy', vendor.cancellation_policy)}
              {isPhoto && kv('Special requests', vendor.special_requests)}
              {!vendor.contact_person && !vendor.quoted_price && !vendor.notes && !vendor.deposit_amount && !vendor.contract_signed && <div className="oi-m-kv"><div className="oi-m-kv__v" style={{ color: 'var(--m-text-2)' }}>Nothing else recorded for {vendor.name} yet. Edit to add dates, a deposit, or your notes.</div></div>}
            </div>
            <PillButton variant="secondary" block icon={Pencil} onClick={onEdit}>Edit vendor</PillButton>
            <button type="button" className="oi-m-pill oi-m-pill--ghost oi-m-pill--block" style={{ color: 'var(--m-primary)' }} onClick={async () => { if (await confirm({ title: `Delete ${vendor.name}`, body: 'Their communications, documents and tasks go too.', action: 'Delete' })) onDelete(); }}>Delete this vendor</button>
          </>
        )}
        {tab === 'comms' && (
          <>
            {comms.length === 0 ? <EmptyState icon={MessageSquare} text="No communications logged yet. Keep every call, email and meeting here." actionLabel="Log one" onAction={() => setLogSheet('log')} /> : (
              <RowGroup>{comms.map((l) => { const Icon = LOG_ICON[l.type] || MessageSquare; return <Row key={l.id} icon={Icon} tile="neutral" label={l.subject || LOG_TYPES.find((t) => t.value === l.type)?.label || 'Note'} sub={[l.logged_at ? dateShort(l.logged_at) : '', l.body].filter(Boolean).join(', ')} wrap trailing={<button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Delete this entry" onClick={async () => { if (await confirm({ title: 'Delete this entry', action: 'Delete' })) onDeleteLog(l); }}><Trash2 size={18} strokeWidth={1.75} /></button>} chevron={false} />; })}</RowGroup>
            )}
            <PillButton variant="primary" block icon={Plus} onClick={() => setLogSheet('log')}>Log a communication</PillButton>
          </>
        )}
        {tab === 'docs' && (
          <>
            {docs.length === 0 ? <EmptyState icon={FileText} text="No documents yet. Contracts, invoices, quotes and receipts live here." actionLabel="Add a document" onAction={() => setLogSheet('doc')} /> : (
              <RowGroup>{docs.map((l) => (
                <div key={l.id} className="oi-m-row">
                  <span className="oi-m-row__tile oi-m-row__tile--neutral"><FileText size={19} strokeWidth={1.75} /></span>
                  <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={l.document_url ? () => openExternal(l.document_url) : undefined}>
                    <div className="oi-m-row__label oi-m-row__label--wrap">{l.subject || l.document_name || 'Document'}</div>
                    <div className="oi-m-row__sub">{[DOC_TYPES.find((t) => t.value === l.document_type)?.label, l.document_name, l.logged_at ? dateShort(l.logged_at) : ''].filter(Boolean).join(', ')}</div>
                  </button>
                  <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Delete this document" onClick={async () => { if (await confirm({ title: 'Delete this document', action: 'Delete' })) onDeleteLog(l); }}><Trash2 size={18} strokeWidth={1.75} /></button>
                </div>
              ))}</RowGroup>
            )}
            <PillButton variant="primary" block icon={Upload} onClick={() => setLogSheet('doc')}>Add a document</PillButton>
          </>
        )}
        {tab === 'tasks' && (
          <>
            {tasks.length === 0 ? <EmptyState icon={CheckSquare} text="No tasks for this vendor yet." actionLabel="Add a task" onAction={() => setTaskSheet(true)} /> : (
              <RowGroup>
                {tasks.map((t) => (
                  <div key={t.id} className="oi-m-row">
                    <Checkbox checked={!!t.completed} onChange={() => onToggleTask(t)} label={t.title} />
                    <div className="oi-m-row__body"><div className={`oi-m-row__label oi-m-row__label--wrap${t.completed ? ' oi-m-task__title--done' : ''}`}>{t.title}</div><div className="oi-m-row__sub">{[t.due_date ? `Due ${dateShort(t.due_date)}` : '', t.priority && t.priority !== 'medium' ? `${t.priority} priority` : ''].filter(Boolean).join(', ')}</div></div>
                    <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label={`Delete ${t.title}`} onClick={async () => { if (await confirm({ title: 'Delete this task', body: t.title, action: 'Delete' })) onDeleteTask(t); }}><Trash2 size={18} strokeWidth={1.75} /></button>
                  </div>
                ))}
              </RowGroup>
            )}
            <PillButton variant="primary" block icon={Plus} onClick={() => setTaskSheet(true)}>Add a task</PillButton>
          </>
        )}
      </div>
      {logSheet && <LogSheet mode={logSheet} onClose={() => setLogSheet(null)} onSave={async (v) => { await onAddLog(v); setLogSheet(null); }} onUpload={onUpload} />}
      {taskSheet && <FormSheet open title="Add a task" fields={[{ name: 'title', label: 'Task', type: 'text', placeholder: 'Send the signed contract' }, { name: 'due_date', label: 'Due date', type: 'date' }, { name: 'priority', label: 'Priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }]} initial={{ priority: 'medium' }} required={['title']} onClose={() => setTaskSheet(false)} onSave={async (v) => { await onAddTask({ ...v, completed: false }); }} saveLabel="Add task" />}
      {confirmEl}
    </Screen>
  );
}

/** VendorDetailPanel's log form: a communication, or a document with an upload. */
function LogSheet({ mode, onClose, onSave, onUpload }) {
  const [f, setF] = useState({ type: mode === 'doc' ? 'document' : 'note', subject: '', body: '', document_type: 'contract', document_url: '', document_name: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef(null);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true); setErr('');
    try { const r = await onUpload(file); setF((s) => ({ ...s, document_url: r.file_url, document_name: file.name })); } catch (e) { setErr(e?.message || 'Could not upload that file.'); } finally { setBusy(false); }
  };
  const save = async () => {
    if (mode === 'doc' && !f.document_url) { setErr('Add the file first.'); return; }
    if (mode !== 'doc' && !f.subject.trim() && !f.body.trim()) { setErr('Add a subject or a note.'); return; }
    setBusy(true);
    try { await onSave({ ...f, logged_at: new Date().toISOString() }); } catch (e) { setErr(e?.message || 'Could not save.'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open onClose={onClose} title={mode === 'doc' ? 'Add a document' : 'Log a communication'} footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'doc' ? (
          <>
            <SelectField label="Document type" value={f.document_type} onChange={(e) => setF({ ...f, document_type: e.target.value })} options={DOC_TYPES} />
            <TextField label="Label" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Signed contract" />
            <input ref={input} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.heic" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PillButton variant="secondary" size="sm" icon={Upload} onClick={() => input.current?.click()} disabled={busy}>{f.document_name ? 'Change file' : 'Choose a file'}</PillButton>
              {f.document_name && <span className="oi-m-meta" style={{ overflowWrap: 'anywhere' }}>{f.document_name}</span>}
            </div>
          </>
        ) : (
          <>
            <SelectField label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={LOG_TYPES} />
            <TextField label="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Quote for the full day" />
            <TextAreaField label="Notes" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={4} />
          </>
        )}
        {err && <p className="oi-m-field__error" role="alert">{err}</p>}
      </div>
    </BottomSheet>
  );
}

