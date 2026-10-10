import React, { useCallback, useMemo, useState } from 'react';
import { useOpenById } from '../../lib/openById';
import { Plus, Calendar, ListChecks, Store, Flag, Clock, Copy, CalendarPlus, Download, ExternalLink, ArrowUp, ArrowDown, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { GroupedList, Row, RowGroup, FilterPills, EmptyState, ErrorState, SkeletonRows, StatusPill, SelectField, PanelCard, TextField, StatCard, PillButton } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { timeLabel } from '../../lib/format';
import { buildScheduleEvents, groupEventsByDay, WHEN_LABEL, WHEN_RANK, ROW_HOME, PLANNING_CATEGORIES, CATEGORY_LABEL, eventsInSchedule, runSheetFor, unplaceableCount } from '@/lib/scheduleEvents';
import { sortScheduleItems } from '@/lib/scheduleOrder';
import { buildIcsCalendar, slugifyForFilename } from '@/lib/ics';
import { exportText } from '../../native';
import { useConsiderations } from '../../features/ConsiderationsSheet';


const SEGMENTS = [{ key: 'timeline', label: 'Timeline' }, { key: 'events', label: 'My events' }, { key: 'runsheet', label: 'Run sheet' }, { key: 'share', label: 'Calendar' }];
const TYPE_ORDER = Object.keys(WHEN_RANK).sort((a, b) => WHEN_RANK[a] - WHEN_RANK[b]);
const TYPE_ICON = { planning: Calendar, 'wedding-day': Calendar, after: Calendar, todo: ListChecks, vendor: Store, deadline: Flag };

/** ScheduleForm.jsx's fields, the category grouped as planning item or part of an event. */
const CATEGORIES = [['ceremony', 'Ceremony'], ['reception', 'Reception'], ['photography', 'Photography'], ['preparation', 'Preparation'], ['transportation', 'Transport'], ['rehearsal', 'Rehearsal'], ['pre_wedding', 'Pre-wedding'], ['post_wedding', 'Post-wedding'], ['other', 'Other']];
const CATEGORY_OPTIONS = [
  ...CATEGORIES.filter(([v]) => PLANNING_CATEGORIES.has(v)).map(([value, label]) => ({ value, label: `Planning: ${label}` })),
  ...CATEGORIES.filter(([v]) => !PLANNING_CATEGORIES.has(v)).map(([value, label]) => ({ value, label: `Part of an event: ${label}` })),
];
export const SCHEDULE_FIELDS = [
  { name: 'event_name', label: 'Event', type: 'text', placeholder: 'Event or activity name' },
  { name: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
  { name: 'event_date', label: 'Date', type: 'date' },
  { name: 'start_time', label: 'Starts', type: 'time' },
  { name: 'end_time', label: 'Ends', type: 'time' },
  { name: 'location', label: 'Where', type: 'text', placeholder: 'Venue or location' },
  { name: 'responsible_person', label: 'Who is responsible', type: 'text' },
  { name: 'description', label: 'What happens', type: 'textarea' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

/** ScheduleTable.jsx's sortable columns; the default is date then time. */
const TIMELINE_SORTS = [{ value: 'default', label: 'Date and time' }, { value: 'title', label: 'Event' }, { value: 'when', label: 'Type' }, { value: 'location', label: 'Location' }, { value: 'notes', label: 'Notes' }];
const naturalCompare = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
function sortEvents(list, key, dir) {
  if (key === 'default') return list;
  const get = { title: (e) => e.title || '', when: (e) => WHEN_RANK[e.when] ?? 99, location: (e) => e.location || '', notes: (e) => e.notes || e.description || '' }[key];
  const cmp = key === 'when' ? (a, b) => a - b : naturalCompare;
  const out = [...list].sort((a, b) => cmp(get(a), get(b)));
  return dir === 'desc' ? out.reverse() : out;
}

const dayTitle = (date) => (date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'No date yet');

/**
 * Schedule: the desktop ScheduleHub. Timeline is the merged list
 * (buildScheduleEvents: schedule rows, vendor dates, to-dos, deadlines,
 * the wedding day) with the type filter, grouped by day under sticky
 * headers. My events adds, edits and deletes Schedule records with the
 * full form. Run sheet shows each event's items. Calendar carries the
 * Google Calendar subscription and the .ics and CSV exports.
 */
export default function ScheduleScreen({ notice, items = [], sources = {}, feedUrl, feedState = 'loading', onCreate, onUpdate, onDelete, onReorder, onOpenHome, loading, error, onRetry, back, openAdd = false, openEvent = null, onRefresh }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [sheet, setSheet] = useState(openAdd ? { item: null } : null);
  // Reached from global search with an event id: its details open once the list is in.
  useOpenById(items, openEvent, useCallback((it) => setSheet({ item: it }), []));
  const [confirm, confirmEl] = useConfirm();
  const considerations = useConsiderations('schedule');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'default', dir: 'asc' });
  const events = useMemo(() => buildScheduleEvents({ scheduleItems: items, ...sources }), [items, sources]);
  const counts = useMemo(() => ({ all: events.length, ...Object.fromEntries(TYPE_ORDER.map((t) => [t, events.filter((e) => e.when === t).length])) }), [events]);
  const locations = useMemo(() => [...new Set(events.map((e) => e.location).filter(Boolean))].sort(naturalCompare), [events]);
  // ScheduleTable.jsx: the type filter, the location filter and the search by event or location.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = events.filter((e) => (type === 'all' || e.when === type) && (locationFilter === 'all' || e.location === locationFilter) && (!q || `${e.title || ''} ${e.location || ''}`.toLowerCase().includes(q)));
    return sortEvents(list, sort.key, sort.dir);
  }, [events, type, locationFilter, search, sort]);
  // Sorted by a column, the timeline is one flat list; by date it groups under day headers, as the desktop does.
  const days = useMemo(() => (sort.key === 'default' ? groupEventsByDay(visible) : [{ date: null, events: visible, flat: true }]), [visible, sort.key]);
  // ScheduleHub.jsx's four stat tiles.
  const stats = useMemo(() => { const by = (t) => events.filter((e) => e.when === t).length; return { total: events.length, onTheDay: by('wedding-day'), around: by('planning') + by('after'), todo: by('todo'), vendor: by('vendor'), deadline: by('deadline') }; }, [events]);
  const remove = async (it) => {
    if (!(await confirm({ title: 'Delete this event', body: `${it.event_name} comes off your schedule and your guests' schedule.`, action: 'Delete' }))) return;
    await onDelete(it.id);
    setSheet(null);
  };
  const exportCsv = async () => {
    const csv = [['Event Name', 'Date', 'Start Time', 'End Time', 'Location', 'Category', 'Responsible Person', 'Description', 'Notes'].join(','), ...items.map((i) => [i.event_name, i.event_date || '', i.start_time, i.end_time || '', i.location || '', i.category || '', i.responsible_person || '', i.description || '', i.notes || ''].map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const r = await exportText('wedding-schedule.csv', 'text/csv', csv);
    if (r !== 'failed') toast.success('Schedule exported'); else toast.error('Could not export the schedule.');
  };
  const exportIcs = async () => {
    const r = await exportText('wedding-schedule.ics', 'text/calendar', buildIcsCalendar(items, 'Wedding schedule'));
    if (r !== 'failed') toast.success('Calendar file ready'); else toast.error('Could not build the calendar file.');
  };
  const openEdit = (e) => { const it = items.find((i) => i.id === e.sourceId); if (it) setSheet({ item: it }); };
  const actions = segment === 'events' || segment === 'timeline' ? [{ icon: Plus, label: 'Add event', onClick: () => setSheet({ item: null }) }] : [];

  return (
    <Screen notice={notice} title="Schedule" subtitle={loading ? '' : `${items.length} event${items.length === 1 ? '' : 's'} of yours, ${events.length} on the timeline`} back={back} actions={actions} onRefresh={onRefresh}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'timeline' && <FilterPills options={[{ key: 'all', label: 'All', count: counts.all }, ...TYPE_ORDER.filter((t) => counts[t]).map((t) => ({ key: t, label: WHEN_LABEL[t], count: counts[t] }))]} value={type} onChange={setType} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: segment === 'timeline' ? 16 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : (
          <>
            {segment === 'timeline' && events.length > 0 && (
              <>
                <div className="oi-m-grid2">
                  <StatCard label="On the timeline" numeric={stats.total} sub={stats.total ? `${stats.onTheDay} on the day, ${stats.around} around it` : undefined} />
                  <StatCard label="Your events" numeric={items.length} sub={items.length ? 'the ones you add here' : undefined} ink />
                  <StatCard label="To-dos due" numeric={stats.todo} sub={stats.todo ? 'open, with a date' : undefined} />
                  <StatCard label="Vendor dates" numeric={stats.vendor} sub={stats.deadline ? `${stats.deadline} deadline${stats.deadline === 1 ? '' : 's'} too` : undefined} ink />
                </div>
                <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Event or location" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    {locations.length > 0 && <div style={{ flex: 1 }}><SelectField label="Location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} options={[{ value: 'all', label: 'Anywhere' }, ...locations.map((l) => ({ value: l, label: l }))]} /></div>}
                    <div style={{ flex: 1 }}><SelectField label="Sort" value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'asc' })} options={TIMELINE_SORTS} /></div>
                    {sort.key !== 'default' && <button type="button" className="oi-m-iconbtn" style={{ alignSelf: 'flex-end' }} aria-label={sort.dir === 'asc' ? 'Sort descending' : 'Sort ascending'} onClick={() => setSort((x) => ({ ...x, dir: x.dir === 'asc' ? 'desc' : 'asc' }))}>{sort.dir === 'asc' ? <ArrowDown size={20} strokeWidth={1.75} /> : <ArrowUp size={20} strokeWidth={1.75} />}</button>}
                  </div>
                </div>
              </>
            )}
            {segment === 'timeline' && (days.length === 0 || visible.length === 0 ? (
              events.length === 0 ? <EmptyState icon={Calendar} text="Nothing on the timeline yet. Add your first event and the day starts to take shape." actionLabel="Add an event" onAction={() => setSheet({ item: null })} /> : <EmptyState icon={Search} text="Nothing matches that search or filter." />
            ) : (
              <GroupedList groups={days.map((d) => ({
                key: d.flat ? 'sorted' : (d.date || 'none'),
                title: d.flat ? `${visible.length} on the timeline` : dayTitle(d.date),
                rows: d.events.map((e) => {
                  const Icon = TYPE_ICON[e.when] || Calendar;
                  const home = e.readOnly ? ROW_HOME[e.kind] : null;
                  return <Row key={e.id} icon={Icon} tile={e.when === 'wedding-day' ? 'primary' : 'neutral'} label={String(e.title || '').replace(/\s[\u2014\u2013]\s/g, ', ')} sub={[e.time ? timeLabel(e.time) : '', e.location].filter(Boolean).join(', ')} wrap trailing={<StatusPill tone={e.when === 'deadline' ? 'warn' : e.when === 'wedding-day' ? 'ok' : 'neutral'}>{WHEN_LABEL[e.when] || e.when}</StatusPill>} onClick={e.readOnly ? (home ? () => onOpenHome?.(e.kind) : undefined) : () => openEdit(e)} chevron={!e.readOnly || !!home} />;
                }),
              }))} />
            ))}

            {segment === 'events' && (items.length === 0 ? (
              <EmptyState icon={Calendar} text="No events of your own yet." actionLabel="Add an event" onAction={() => setSheet({ item: null })} />
            ) : (
              <GroupedList groups={groupItems(items).map((g) => ({ key: g.key, title: g.title, rows: g.items.map((it) => <Row key={it.id} icon={Calendar} tile="neutral" label={it.event_name} sub={[it.start_time ? `${timeLabel(it.start_time)}${it.end_time ? ` to ${timeLabel(it.end_time)}` : ''}` : '', it.location, CATEGORY_LABEL[it.category]].filter(Boolean).join(', ')} wrap onClick={() => setSheet({ item: it })} />) }))} />
            ))}

            {segment === 'timeline' && !loading && !error && considerations.row}
            {segment === 'runsheet' && <RunSheet items={items} onEdit={(it) => setSheet({ item: it })} onDelete={remove} onReorder={onReorder} onAdd={(ev) => setSheet({ item: null, preset: { category: ev.key, event_date: ev.date } })} />}

            {segment === 'share' && (
              <>
                <section>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Subscribe</h2>
                  {feedState === 'loading' ? <SkeletonRows count={2} /> : feedState === 'unavailable' || !feedUrl ? (
                    <div className="oi-m-card"><p className="oi-m-body">Calendar subscribing is not available for this wedding yet. Download a snapshot below, or add an event to your calendar from its sheet.</p></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <PanelCard tone="ink" label="Google Calendar" title="Subscribe to your schedule" body="Your schedule events, kept up to date. To-dos and deadlines stay here. Google refreshes every few hours." action="Open Google Calendar" onClick={() => onOpenHome?.('google-calendar', feedUrl)} />
                      <RowGroup>
                        <Row icon={CalendarPlus} tile="neutral" label="Add to the phone's calendar" sub="Opens the subscribe link" onClick={() => onOpenHome?.('webcal', feedUrl)} />
                        <Row icon={Copy} tile="neutral" label="Copy subscribe link" onClick={async () => { try { await navigator.clipboard.writeText(feedUrl); toast.success('Subscribe link copied'); } catch { toast.error('Could not copy the link'); } }} chevron={false} />
                      </RowGroup>
                    </div>
                  )}
                </section>
                <section>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Export</h2>
                  <RowGroup>
                    <Row icon={Download} tile="neutral" label="Download a snapshot (.ics)" sub="Every event of yours, once, for any calendar app" onClick={exportIcs} chevron={false} />
                    <Row icon={ExternalLink} tile="neutral" label="Export as CSV" sub="A spreadsheet of your events" onClick={exportCsv} chevron={false} />
                  </RowGroup>
                </section>
              </>
            )}
          </>
        )}
      </div>
      {sheet && (
        <FormSheet open full title={sheet.item ? 'Edit event' : 'Add event'} fields={SCHEDULE_FIELDS} initial={sheet.item || { category: 'other', ...(sheet.preset || {}) }} required={['event_name', 'event_date', 'start_time']} onClose={() => setSheet(null)}
          onSave={async (v) => { if (sheet.item) { await onUpdate(sheet.item.id, v); } else { await onCreate(v); } }}
          onDelete={sheet.item ? () => remove(sheet.item) : undefined} deleteLabel="Delete" saveLabel={sheet.item ? 'Save' : 'Add event'}>
          {/* Goal 8: one event into the phone's calendar, the existing single-event .ics through the share sheet; no feed needed. */}
          {sheet.item && (
            <RowGroup>
              <Row icon={CalendarPlus} tile="neutral" label="Add to calendar" sub="This event, as a calendar file" chevron={false} onClick={async () => { const r = await exportText(`${slugifyForFilename(sheet.item.event_name || 'event')}.ics`, 'text/calendar', buildIcsCalendar([sheet.item], sheet.item.event_name || 'Wedding event')); if (r === 'failed') toast.error('Could not make the calendar file'); else if (r !== 'native') toast.success('Calendar file ready'); }} />
            </RowGroup>
          )}
        </FormSheet>
      )}
      {confirmEl}
      {considerations.sheet}
    </Screen>
  );
}

function groupItems(items) {
  const m = new Map();
  for (const it of sortScheduleItems(items)) { const k = String(it.event_date || '').slice(0, 10) || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
  return [...m.entries()].map(([k, list]) => ({ key: k || 'none', title: dayTitle(k), items: list }));
}

/** RunSheet.jsx: the items placed in each event, or all events with headings; rows edit, delete and move (a move swaps start times). */
function RunSheet({ items, onEdit, onDelete, onReorder, onAdd }) {
  const events = useMemo(() => eventsInSchedule(items), [items]);
  const unplaceable = useMemo(() => unplaceableCount(items), [items]);
  const [which, setWhich] = useState('all');
  const [busy, setBusy] = useState(false);
  if (events.length === 0) return <EmptyState icon={Clock} text="The run sheet fills in as you add items to your ceremony, reception and other events." />;
  const show = which === 'all' ? events : events.filter((e) => e.key === which);
  const active = which === 'all' ? null : events.find((e) => e.key === which);
  const move = async (rows, row, dir) => {
    const i = rows.findIndex((r) => r.id === row.id);
    const j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length || !onReorder) return;
    setBusy(true);
    try { await onReorder(row, rows[j]); } finally { setBusy(false); }
  };
  return (
    <>
      <SelectField label="Event" value={which} onChange={(e) => setWhich(e.target.value)} options={[{ value: 'all', label: `All (${events.reduce((n, e) => n + e.count, 0)})` }, ...events.map((e) => ({ value: e.key, label: `${e.label} (${e.count})` }))]} />
      {unplaceable > 0 && <p className="oi-m-meta">{unplaceable === 1 ? '1 item could not be placed on a run sheet: it has no event tag. Open it from My events and choose what it is.' : `${unplaceable} items could not be placed on a run sheet: they have no event tag. Open them from My events and choose what they are.`}</p>}
      {active && onAdd && <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => onAdd(active)} style={{ alignSelf: 'flex-start' }}>Add a moment to {active.label}</PillButton>}
      <GroupedList groups={show.map((e) => {
        const rows = runSheetFor(items, e.key);
        return {
          key: e.key,
          title: e.label,
          rows: rows.map((r, i) => (
            <div key={r.id} className="oi-m-row" style={{ minHeight: 68 }}>
              <span className="oi-m-row__tile oi-m-row__tile--neutral"><Clock size={19} strokeWidth={1.75} /></span>
              <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => onEdit?.(r)}>
                <div className="oi-m-row__label oi-m-row__label--wrap">{r.event_name}</div>
                <div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{[r.start_time ? timeLabel(r.start_time) : '', r.responsible_person, r.notes || r.description].filter(Boolean).join(', ')}</div>
              </button>
              <div style={{ display: 'flex', flexShrink: 0 }}>
                <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label={`Move ${r.event_name} up`} disabled={busy || i === 0} onClick={() => move(rows, r, 'up')} style={{ opacity: i === 0 ? 0.3 : 1 }}><ArrowUp size={18} strokeWidth={1.75} /></button>
                <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label={`Move ${r.event_name} down`} disabled={busy || i === rows.length - 1} onClick={() => move(rows, r, 'down')} style={{ opacity: i === rows.length - 1 ? 0.3 : 1 }}><ArrowDown size={18} strokeWidth={1.75} /></button>
                <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label={`Delete ${r.event_name}`} onClick={() => onDelete?.(r)}><Trash2 size={18} strokeWidth={1.75} /></button>
              </div>
            </div>
          )),
        };
      })} />
    </>
  );
}
