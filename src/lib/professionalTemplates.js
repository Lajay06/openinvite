/**
 * src/lib/professionalTemplates.js
 *
 * BUILT-IN TEMPLATES, AND APPLYING ANY TEMPLATE TO A NEW EVENT.
 * goals/2026-10-14-professional.md, What a professional gets, 8 and 9: tasks
 * by months to go (12, 9, 6, 3, 1, the week of, the day of), and saving any
 * run sheet, checklist, budget, questionnaire or vendor package to start new
 * events from it.
 */

export const MONTHS_OUT = [
  { key: '12', label: '12 months to go', days: 365 },
  { key: '9', label: '9 months to go', days: 270 },
  { key: '6', label: '6 months to go', days: 182 },
  { key: '3', label: '3 months to go', days: 91 },
  { key: '1', label: '1 month to go', days: 30 },
  { key: 'week', label: 'The week of', days: 7 },
  { key: 'day', label: 'The day of', days: 0 },
];

export const TEMPLATE_KINDS = [
  { key: 'runsheet', label: 'Run sheet' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'budget', label: 'Budget' },
  { key: 'questionnaire', label: 'Questionnaire' },
  { key: 'vendors', label: 'Vendor package' },
];

const H = (h, m = 0) => h * 60 + m;

/** The two templates every workspace starts with. Their ids start with builtin_. */
export const BUILT_IN = [
  {
    id: 'builtin_day',
    kind: 'runsheet',
    name: 'Standard wedding day',
    body: {
      rows: [
        ['Setup', H(9), 120, 'Vendor load-in', 'Venue', ''],
        ['Setup', H(11), 90, 'Ceremony setup: chairs, arch, signage', 'Ceremony site', ''],
        ['Setup', H(13), 60, 'Reception setup: tables, place cards, favors', 'Reception', ''],
        ['Ceremony', H(15, 30), 30, 'Guests arrive', 'Ceremony site', 'Welcome drinks out'],
        ['Ceremony', H(16), 30, 'Ceremony', 'Ceremony site', 'Processional cue'],
        ['Ceremony', H(16, 30), 30, 'Family photos', 'Ceremony site', 'Photo list'],
        ['Reception', H(17), 60, 'Cocktail hour', 'Terrace', ''],
        ['Reception', H(18), 15, 'Guests seated', 'Reception', ''],
        ['Reception', H(18, 30), 15, 'Couple entrance', 'Reception', 'Entrance song'],
        ['Reception', H(19), 60, 'Dinner', 'Reception', ''],
        ['Reception', H(20), 30, 'Speeches', 'Reception', 'Mic check first'],
        ['Reception', H(20, 30), 10, 'First dance', 'Reception', ''],
        ['Reception', H(21), 120, 'Dancing', 'Reception', ''],
        ['Pack-down', H(23), 60, 'Pack-down and vendor load-out', 'Venue', ''],
      ],
    },
  },
  {
    id: 'builtin_checklist',
    kind: 'checklist',
    name: 'Planning checklist by months to go',
    body: {
      tasks: [
        ['12', 'Confirm venue and date'], ['12', 'Agree the planning fee and payment schedule'], ['12', 'Book photographer'],
        ['9', 'Book caterer and arrange a tasting'], ['9', 'Book florist'], ['9', 'Book music'],
        ['6', 'Order invitations through the couple’s Openinvite'], ['6', 'Book transport'], ['6', 'Hair and makeup trial'],
        ['3', 'Send the couple the questionnaire'], ['3', 'Confirm the menu'], ['3', 'Collect vendor insurance certificates'],
        ['1', 'Final numbers to the caterer'], ['1', 'Draft the run sheet with the couple'], ['1', 'Confirm every vendor arrival time'],
        ['week', 'Send vendor run sheets'], ['week', 'Confirm the seating plan'], ['week', 'Pack the emergency kit'],
        ['day', 'Day-of mode on, run sheet live'],
      ],
    },
  },
];

/** A task due date for a months-out key, counted back from the event. */
export function dueDateFor(eventDate, monthsOutKey) {
  const mo = MONTHS_OUT.find((m) => m.key === monthsOutKey);
  if (!eventDate || !mo) return null;
  const d = new Date(`${eventDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - mo.days);
  return d.toISOString().slice(0, 10);
}

/**
 * The rows a template adds to a new event. Pure: returns { RunSheetRow: [],
 * ProTask: [], ProCost: [], VendorBookingIds: [] } for the caller to write.
 * A task whose due date is already past keeps its date, so it shows as
 * overdue rather than vanishing.
 */
export function applyTemplate(template, event) {
  const out = { RunSheetRow: [], ProTask: [], ProCost: [], ProQuestionnaire: [] };
  if (!template) return out;
  const b = template.body || {};
  if (template.kind === 'runsheet') {
    (b.rows || []).forEach((r, i) => {
      const [sheet, start_minute, duration_minutes, item, location, cue] = Array.isArray(r) ? r : [r.sheet, r.start_minute, r.duration_minutes, r.item, r.location, r.cue];
      out.RunSheetRow.push({ event_id: event.id, sheet, start_minute, duration_minutes, item, location: location || '', owner_ref: '', cue: cue || '', notes: '', status: 'todo', sort: i });
    });
  }
  if (template.kind === 'checklist') {
    (b.tasks || []).forEach((t) => {
      const [months_out, title] = Array.isArray(t) ? t : [t.months_out, t.title];
      out.ProTask.push({ event_id: event.id, title, owner_id: (event.assigned_member_ids || [])[0] || null, due_date: dueDateFor(event.event_date, months_out), done: false, months_out });
    });
  }
  if (template.kind === 'budget') {
    (b.lines || []).forEach((l) => out.ProCost.push({ event_id: event.id, kind: l.kind || 'cost', label: l.label, amount: Number(l.amount) || 0 }));
  }
  if (template.kind === 'questionnaire') {
    out.ProQuestionnaire.push({ event_id: event.id, title: template.name, questions: b.questions || [], status: 'draft' });
  }
  return out;
}

/** Save an event's run sheet as a template body. */
export function runSheetTemplateBody(rows) {
  return { rows: rows.slice().sort((a, b) => a.sheet.localeCompare(b.sheet) || a.start_minute - b.start_minute).map((r) => [r.sheet, r.start_minute, r.duration_minutes, r.item, r.location, r.cue]) };
}
