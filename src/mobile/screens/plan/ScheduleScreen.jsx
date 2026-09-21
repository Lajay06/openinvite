import React, { useMemo, useState } from 'react';
import { Plus, Calendar, ListChecks, Store, Flag, Clock, Copy, CalendarPlus, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { GroupedList, Row, RowGroup, FilterPills, EmptyState, ErrorState, SkeletonRows, StatusPill, SelectField, PanelCard } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { timeLabel } from '../../lib/format';
import { buildScheduleEvents, groupEventsByDay, WHEN_LABEL, WHEN_RANK, ROW_HOME, PLANNING_CATEGORIES, CATEGORY_LABEL, eventsInSchedule, runSheetFor } from '@/lib/scheduleEvents';
import { sortScheduleItems } from '@/lib/scheduleOrder';
import { buildIcsCalendar } from '@/lib/ics';
import { exportText } from '../../native';

const SEGMENTS = [{ key: 'timeline', label: 'Timeline' }, { key: 'events', label: 'My events' }, { key: 'runsheet', label: 'Run sheet' }, { key: 'share', label: 'Calendar' }];
const TYPE_ORDER = Object.keys(WHEN_RANK).sort((a, b) => WHEN_RANK[a] - WHEN_RANK[b]);
const TYPE_ICON = { planning: Calendar, 'wedding-day': Calendar, after: Calendar, todo: ListChecks, vendor: Store, deadline: Flag };

/** ScheduleForm.jsx's fields, the category grouped as planning item or part of an event. */
const CATEGORIES = [['ceremony', 'Ceremony'], ['reception', 'Reception'], ['photography', 'Photography'], ['preparation', 'Preparation'], ['transportation', 'Transportation'], ['rehearsal', 'Rehearsal'], ['pre_wedding', 'Pre-wedding'], ['post_wedding', 'Post-wedding'], ['other', 'Other']];
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

const dayTitle = (date) => (date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'No date yet');

/**
 * Schedule: the desktop ScheduleHub. Timeline is the merged list
 * (buildScheduleEvents: schedule rows, vendor dates, to-dos, deadlines,
 * the wedding day) with the type filter, grouped by day under sticky
 * headers. My events adds, edits and deletes Schedule records with the
 * full form. Run sheet shows each event's items. Calendar carries the
 * Google Calendar subscription and the .ics and CSV exports.
 */
export default function ScheduleScreen({ items = [], sources = {}, feedUrl, feedState = 'loading', onCreate, onUpdate, onDelete, onOpenHome, loading, error, onRetry, back, openAdd = false, onRefresh }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [sheet, setSheet] = useState(openAdd ? { item: null } : null);
  const [confirm, confirmEl] = useConfirm();
  const [type, setType] = useState('all');
  const events = useMemo(() => buildScheduleEvents({ scheduleItems: items, ...sources }), [items, sources]);
  const counts = useMemo(() => ({ all: events.length, ...Object.fromEntries(TYPE_ORDER.map((t) => [t, events.filter((e) => e.when === t).length])) }), [events]);
  const visible = useMemo(() => (type === 'all' ? events : events.filter((e) => e.when === type)), [events, type]);
  const days = useMemo(() => groupEventsByDay(visible), [visible]);
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
    <Screen title="Schedule" subtitle={loading ? '' : `${items.length} event${items.length === 1 ? '' : 's'} of yours, ${events.length} on the timeline`} back={back} actions={actions} onRefresh={onRefresh}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'timeline' && <FilterPills options={[{ key: 'all', label: 'All', count: counts.all }, ...TYPE_ORDER.filter((t) => counts[t]).map((t) => ({ key: t, label: WHEN_LABEL[t], count: counts[t] }))]} value={type} onChange={setType} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: segment === 'timeline' ? 16 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : (
          <>
            {segment === 'timeline' && (days.length === 0 ? (
              <EmptyState icon={Calendar} text="Nothing on the timeline yet. Add your first event and the day starts to take shape." actionLabel="Add an event" onAction={() => setSheet({ item: null })} />
            ) : (
              <GroupedList groups={days.map((d) => ({
                key: d.date || 'none',
                title: dayTitle(d.date),
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

            {segment === 'runsheet' && <RunSheet items={items} />}

            {segment === 'share' && (
              <>
                <section>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Subscribe</h2>
                  {feedState === 'loading' ? <SkeletonRows count={2} /> : feedState === 'unavailable' || !feedUrl ? (
                    <div className="oi-m-card"><p className="oi-m-body">Calendar subscribing is not switched on for this wedding yet.</p></div>
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
        <FormSheet open full title={sheet.item ? 'Edit event' : 'Add event'} fields={SCHEDULE_FIELDS} initial={sheet.item || { category: 'other' }} required={['event_name', 'event_date', 'start_time']} onClose={() => setSheet(null)}
          onSave={async (v) => { if (sheet.item) { await onUpdate(sheet.item.id, v); } else { await onCreate(v); } }}
          onDelete={sheet.item ? () => remove(sheet.item) : undefined} deleteLabel="Delete" saveLabel={sheet.item ? 'Save' : 'Add event'} />
      )}
      {confirmEl}
    </Screen>
  );
}

function groupItems(items) {
  const m = new Map();
  for (const it of sortScheduleItems(items)) { const k = String(it.event_date || '').slice(0, 10) || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
  return [...m.entries()].map(([k, list]) => ({ key: k || 'none', title: dayTitle(k), items: list }));
}

/** RunSheet.jsx: the items placed in each event, or all events with headings. */
function RunSheet({ items }) {
  const events = useMemo(() => eventsInSchedule(items), [items]);
  const [which, setWhich] = useState('all');
  if (events.length === 0) return <EmptyState icon={Clock} text="The run sheet fills in as you add items to your ceremony, reception and other events." />;
  const show = which === 'all' ? events : events.filter((e) => e.key === which);
  return (
    <>
      <SelectField label="Event" value={which} onChange={(e) => setWhich(e.target.value)} options={[{ value: 'all', label: `All (${events.reduce((n, e) => n + e.count, 0)})` }, ...events.map((e) => ({ value: e.key, label: `${e.label} (${e.count})` }))]} />
      <GroupedList groups={show.map((e) => ({
        key: e.key,
        title: e.label,
        rows: runSheetFor(items, e.key).map((r) => <Row key={r.id} icon={Clock} tile="neutral" label={r.event_name} sub={[r.responsible_person, r.notes || r.description].filter(Boolean).join(', ')} value={r.start_time ? timeLabel(r.start_time) : ''} wrap />),
      }))} />
    </>
  );
}

