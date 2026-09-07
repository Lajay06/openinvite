/**
 * src/lib/scheduleEvents.js — ONE SET OF EVENTS, FOR BOTH WAYS OF LOOKING AT IT.
 *
 * The Schedule page used to show four things and they did not agree about what
 * an event was. The run sheet listed Schedule records only; the calendar
 * aggregated five sources — the Schedule records, the wedding day itself, the
 * RSVP deadline, and three vendor dates (contract, booking, meeting) — plus
 * anything the couple typed into the calendar's own add-event form.
 *
 * So "the list shows every event the calendar shows" was not a property anyone
 * could have asserted: the two views were reading different things and the
 * counts differed by design. A list and a calendar that disagree are two
 * answers to one question, which is the state this page was asked to leave.
 *
 * THE UNION IS THE SHARED SOURCE, and that is a decision worth naming. The
 * other option was to narrow both views to Schedule records, which would have
 * been simpler and would have deleted information the couple can see today —
 * their wedding day, their RSVP deadline, and every vendor date — from the
 * only place that shows them. Nothing disappears; the list simply carries the
 * same events the calendar already carried.
 *
 * WHAT A NORMALIZED EVENT IS. Every source is flattened to the same shape, so
 * neither view has to know which source a row came from to render it:
 *
 *   { id, title, date, time, location, description, type }
 *
 * `location` is empty for the derived rows, because a vendor contract date and
 * an RSVP deadline do not happen anywhere. The list omits the line rather than
 * printing a blank label.
 */

/** Normalized events from every source the Schedule page reads. Pure. */
/**
 * WHICH SIDE OF THE WEDDING AN EVENT SITS ON.
 *
 * The List's Type column, and the one thing the couple sorts by that is not a
 * field on any row: a dress fitting in March and the ceremony in July are the
 * same shape of record and mean entirely different things. Compared as
 * date-only strings, so no timezone can move an event across the boundary.
 */
export function whenRelativeTo(dateStr, weddingDate) {
  if (!dateStr) return 'planning';
  if (!weddingDate) return 'planning';
  const d = String(dateStr).slice(0, 10);
  const w = String(weddingDate).slice(0, 10);
  if (d === w) return 'wedding-day';
  return d < w ? 'planning' : 'after';
}

export const WHEN_LABEL = {
  planning: 'Planning', 'wedding-day': 'Wedding day', after: 'After',
  todo: 'To do', vendor: 'Vendor', deadline: 'Deadline',
};
// The order the Type column sorts in: the way the wedding actually runs, not
// alphabetically, where "After" would come first.
export const WHEN_RANK = {
  planning: 0, 'wedding-day': 1, after: 2, todo: 3, vendor: 4, deadline: 5,
};

/**
 * WHERE A NON-SCHEDULE ROW IS EDITED. It is never edited here: a to-do belongs
 * to the to-do list, a vendor date to the vendor's own record. The row offers
 * the way home and nothing else.
 */
export const ROW_HOME = {
  todo:       { label: 'Open in To do',        to: '/TodoList' },
  vendor:     { label: 'Open in Vendors',      to: '/Vendors' },
  deadline:   { label: 'Open in Event details', to: '/EventDetails' },
  music:      { label: 'Open in Music',        to: '/Music' },
  wd:         { label: 'Open in Event details', to: '/EventDetails' },
  livestream: { label: 'Open in Event details', to: '/EventDetails' },
  custom:     { label: 'Open in Event details', to: '/EventDetails' },
};

/**
 * Which wedding-record row a Schedule row is the same thing as, by name. Used
 * ONLY for the dedupe — it never decides a Type, and an unrecognised name
 * simply never collapses anything.
 */
export function matchKindOf(title) {
  const t = String(title || '').toLowerCase();
  if (/rehearsal/.test(t)) return 'rehearsal';
  if (/welcome/.test(t)) return 'welcome';
  if (/brunch/.test(t)) return 'brunch';
  return '';
}

export function buildScheduleEvents({
  scheduleItems = [], vendors = [], invitation = null, customEvents = [], weddingDate = null,
  todos = [], wd = null, customPages = [], liveStreams = [],
} = {}) {
  const bigDay = weddingDate || invitation?.wedding_date || null;
  const events = [];

  if (invitation?.wedding_date) {
    events.push({
      id: 'wedding-day',
      title: `Wedding day: ${invitation.couple_names || 'Your wedding'}`,
      date: invitation.wedding_date, time: '', location: '',
      description: 'Your special day!', type: 'wedding',
    });
    // The RSVP deadline is emitted below as a DEADLINE row, with its own pill.
    // It was here as a plain 'wedding' row and would otherwise appear twice.
  }

  for (const item of scheduleItems) {
    // A row with no date is still the couple's event. event_date is required
    // by the entity AND by the form, so this should not happen — but "should
    // not happen" is how rows go missing, and the old run sheet listed every
    // Schedule record whether or not it had a date. It is carried through with
    // an empty date; the list gives it a "No date yet" group at the end and
    // the calendar, which has nowhere to draw it, does not.
    events.push({
      id: `schedule-${item.id}`,
      title: item.event_name,
      date: item.event_date || '',
      time: item.start_time || '',
      endTime: item.end_time || '',
      location: item.location || '',
      description: item.description || '',
      category: item.category || '',
      responsible: item.responsible_person || '',
      notes: item.notes || '',
      type: 'schedule',
      sourceId: item.id,
    });
  }

  // The vendor dates are emitted below, each naming WHICH date it is
  // ("Florist — meeting", "Florist — contract signed") rather than three rows
  // that all read as the vendor's name. This loop said "Fleur contract" and
  // "Meeting: Fleur" and would otherwise double every vendor row.

  // ── TO-DOS ────────────────────────────────────────────────────────────
  //
  // The owner's report: "nothing in the to do list is here". A to-do with a
  // due date is a dated thing the couple set, which is the whole test. One
  // WITHOUT a due date is not on any timeline — it is a task, not a date — and
  // a COMPLETED one is history. Both are excluded, and both are planted.
  //
  // Note only. `Task` is a dead entity: getMyRecords('Task') appears nowhere
  // in src/, and to-dos are Notes with view_type 'todo' (TodoList.jsx:159).
  for (const t of todos) {
    if (t?.view_type !== 'todo' || t.completed || !t.due_date) continue;
    events.push({
      id: `todo-${t.id}`, title: t.title || 'Untitled to-do',
      date: t.due_date, time: '', location: '', notes: t.notes || '',
      type: 'todo', kind: 'todo', source: 'To do', readOnly: true,
    });
  }

  // ── VENDOR DATES, EACH NAMING WHICH ONE IT IS ─────────────────────────
  for (const v of vendors) {
    for (const [field, suffix] of [
      ['booking_date', 'booking'], ['contract_date', 'contract signed'], ['meeting_date', 'meeting'],
    ]) {
      const raw = v?.[field];
      if (!raw) continue;
      const [d, clock] = String(raw).split('T');
      events.push({
        id: `vendor-${field}-${v.id}`, title: `${v.name || 'Vendor'} — ${suffix}`,
        date: d, time: field === 'meeting_date' ? (clock || '').slice(0, 5) : (v.start_time || ''),
        location: '', notes: v.category || '',
        type: 'vendor', kind: 'vendor', source: 'Vendors', readOnly: true,
      });
    }
  }

  // ── DEADLINES ─────────────────────────────────────────────────────────
  if (invitation?.rsvp_deadline) {
    events.push({
      id: 'deadline-rsvp', title: 'RSVP deadline', date: invitation.rsvp_deadline,
      time: '', location: '', notes: 'Replies are due by this date',
      type: 'deadline', kind: 'deadline', source: 'Event details', readOnly: true,
    });
  }
  if (wd?.music?.requestsClosedDate) {
    events.push({
      id: 'deadline-music', title: 'Song requests close', date: wd.music.requestsClosedDate,
      time: '', location: '', notes: 'Guests can no longer add songs after this',
      type: 'deadline', kind: 'music', source: 'Music', readOnly: true,
    });
  }

  // ── THE DATED THINGS ON THE WEDDING RECORD ────────────────────────────
  //
  // Typed by POSITION, like a Schedule row: a rehearsal is Planning, a brunch
  // is After — unless the couple dated it before the wedding, in which case it
  // is Planning and the pill says so rather than the name deciding.
  const wdRows = [
    ['rehearsal',   wd?.rehearsal?.date,   wd?.rehearsal?.time, 'Rehearsal',   wd?.rehearsal?.venueName],
    ['welcome',     wd?.welcomeDinner?.date, '',                'Welcome dinner', wd?.welcomeDinner?.venueName],
    ['brunch',      wd?.dayAfterBrunch?.date, '',               'Day-after brunch', wd?.dayAfterBrunch?.venueName],
    ['checkin',     wd?.accommodation?.checkInDate,  '',        'Room block opens', ''],
    ['checkout',    wd?.accommodation?.checkOutDate, '',        'Room block closes', ''],
    ['honeymoon-out', wd?.honeymoonDetails?.departureDate, '',  'Honeymoon departs', ''],
    ['honeymoon-back', wd?.honeymoonDetails?.returnDate, '',    'Honeymoon returns', ''],
  ];
  for (const [key, date, time, title, venue] of wdRows) {
    if (!date) continue;
    events.push({
      id: `wd-${key}`, title, date, time: time || '', location: venue || '', notes: '',
      type: 'schedule-like', kind: 'wd', matchKind: key, source: 'Event details', readOnly: true,
    });
  }

  for (const p of customPages) {
    if (!p?.date) continue;
    const [d, clock] = String(p.date).split('T');
    events.push({
      id: `custom-${p.id}`, title: p.title || p.name || 'Custom event', date: d,
      time: (clock || '').slice(0, 5), location: p.location || '', notes: '',
      type: 'schedule-like', kind: 'custom', source: 'Event details', readOnly: true,
    });
  }

  for (const l of liveStreams) {
    if (!l?.scheduled_start) continue;
    const [d, clock] = String(l.scheduled_start).split('T');
    events.push({
      id: `stream-${l.id}`, title: l.title || 'Live stream', date: d,
      time: (clock || '').slice(0, 5), location: '', notes: '',
      type: 'schedule-like', kind: 'livestream', source: 'Event details', readOnly: true,
    });
  }

  const all = [...events, ...customEvents];

  // ── ONE THING, ONE ROW ────────────────────────────────────────────────
  //
  // A couple can enter the rehearsal twice — once as a Schedule row and once
  // in the wedding record's own rehearsal fields — and both are real data. The
  // TIMELINE shows it once: matched on the same date and the same kind, and
  // THE SCHEDULE ROW WINS, because that is the one they can edit here.
  // Nothing is deleted; the other record still exists where it was written.
  const scheduleKeys = new Set(
    all.filter((e) => e.type === 'schedule')
      .map((e) => `${String(e.date).slice(0, 10)}|${matchKindOf(e.title)}`)
      .filter((k) => !k.endsWith('|')));
  const deduped = all.filter((e) =>
    !(e.kind === 'wd' && e.matchKind && scheduleKeys.has(`${String(e.date).slice(0, 10)}|${e.matchKind}`)));

  // STAMPED ON THE WAY OUT, once, so every source gets the same treatment and
  // no caller has to remember to classify a vendor date.
  return deduped.map((e) => ({
    ...e,
    when: (e.type === 'todo' || e.type === 'vendor' || e.type === 'deadline')
      ? e.type
      : whenRelativeTo(e.date, bigDay),
  }));
}

/**
 * The same events, grouped into days in date order, each day's events in time
 * order. An event with no time sorts before the timed ones — a deadline that
 * has no hour belongs at the top of its day, not at midnight in the middle of
 * a run of morning events.
 */
export function groupEventsByDay(events = []) {
  const byDate = new Map();
  const undated = [];
  for (const e of events) {
    if (!e) continue;
    if (!e.date) { undated.push(e); continue; }
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, items]) => ({
      date,
      events: items.slice().sort((a, b) => {
        if (!a.time && b.time) return -1;
        if (a.time && !b.time) return 1;
        return String(a.time).localeCompare(String(b.time));
      }),
    }));
  // Last, and only when there is one — an empty "No date yet" heading over
  // nothing is noise on every well-formed wedding.
  if (undated.length) days.push({ date: null, events: undated });
  return days;
}
