/**
 * The desktop GuestForm (src/components/guests/GuestForm.jsx), field for
 * field, for the mobile add and edit sheet. The dietary pills join into the
 * one comma-separated string the desktop stores; the meal selects come from
 * the wedding's own mealOptions (Menu Phase 1) and are hidden, with a note,
 * when there are none, as the desktop does.
 */
import { COMMON_TAGS, DIETARY_OPTIONS } from '@/components/guests/GuestForm';
import { needsCountryCode, toE164, COUNTRIES } from '@/lib/phoneE164';

/** CountryPicker's list as select options: the wedding's country is the default. */
export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.iso, label: `${c.label} +${c.dial}` }));

export const GUEST_CATEGORIES = [['family', 'Family'], ['friends', 'Friends'], ['colleagues', 'Colleagues'], ['partners_family', "Partner's family"], ['partners_friends', "Partner's friends"]].map(([value, label]) => ({ value, label }));
export const RSVP_STATUSES = [['pending', 'Pending'], ['attending', 'Attending'], ['declined', 'Declined'], ['maybe', 'Maybe']].map(([value, label]) => ({ value, label }));

const KNOWN = new Set(DIETARY_OPTIONS.filter((o) => o !== 'None' && o !== 'Other'));

/** GuestForm's parseDietary: the stored string back into pills plus the free text. */
export function parseDietary(str) {
  if (!str || !str.trim()) return { selected: [], other: '' };
  const selected = [];
  let other = '';
  for (const part of str.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (KNOWN.has(part)) selected.push(part);
    else if (part === 'Other') { if (!selected.includes('Other')) selected.push('Other'); }
    else if (part.startsWith('Other: ')) { if (!selected.includes('Other')) selected.push('Other'); other = part.slice(7); }
    else { if (!selected.includes('Other')) selected.push('Other'); other = other ? `${other}, ${part}` : part; }
  }
  return { selected, other };
}

/** GuestForm's dietaryToString. */
export function dietaryToString(selected, other) {
  if (!selected || selected.length === 0) return '';
  return selected.map((s) => (s === 'Other' && other ? `Other: ${other}` : s)).join(', ');
}

const DIETARY_PILLS = DIETARY_OPTIONS.filter((o) => o !== 'None');

export function guestFields({ mealOptions = [], country = 'AU' } = {}) {
  const mealSelect = mealOptions.length ? mealOptions.map((m) => ({ value: m.id, label: m.label })) : null;
  const hasPlusOne = (v) => !!v.plus_one;
  return [
    { type: 'heading', label: 'Basics' },
    { name: 'name', label: 'Name', type: 'text', placeholder: "Guest's full name", autoCapitalize: 'words' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'guest@example.com' },
    { name: 'phone_country', label: 'Phone country', type: 'select', options: COUNTRY_OPTIONS, default: country },
    // GuestForm.jsx: an unreadable number warns and is never rewritten, but the save goes through.
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: 'Mobile number', warn: (v, values) => (v && needsCountryCode(v, values.phone_country || country) ? 'That does not look like a phone number. Check the country and the digits; invitations are not sent to a number we cannot read.' : '') },
    { name: 'category', label: 'Category', type: 'select', options: GUEST_CATEGORIES, placeholder: 'Choose a category' },
    { name: 'table_assignment', label: 'Table', type: 'text', placeholder: 'Table number or name' },
    { name: 'rsvp_status', label: 'RSVP status', type: 'select', options: RSVP_STATUSES },
    { type: 'heading', label: 'Meal' },
    ...(mealSelect
      ? [{ name: 'meal_choice', label: 'Meal choice', type: 'select', options: mealSelect, placeholder: 'Not set' }]
      : [{ type: 'note', label: 'Set up meal options in Food & beverage to record meal choices.' }]),
    { type: 'heading', label: 'Tags' },
    { name: 'tags', label: 'Tags', type: 'tags', suggestions: COMMON_TAGS },
    { type: 'heading', label: 'Dietary' },
    { name: 'dietary_pills', label: 'Dietary restrictions', type: 'pills', multi: true, options: DIETARY_PILLS },
    { name: 'dietary_other', label: 'Describe the restriction', type: 'text', showIf: (v) => (v.dietary_pills || []).includes('Other') },
    { type: 'heading', label: 'Plus one' },
    { name: 'plus_one', label: 'This guest can bring a plus one', type: 'toggle' },
    { name: 'plus_one_name', label: 'Plus one name', type: 'text', showIf: hasPlusOne, autoCapitalize: 'words' },
    { name: 'plus_one_email', label: 'Plus one email', type: 'email', placeholder: 'They get their own invitation and RSVP link', showIf: hasPlusOne },
    ...(mealSelect ? [{ name: 'plus_one_meal_choice', label: 'Plus one meal choice', type: 'select', options: mealSelect, placeholder: 'Not set', showIf: hasPlusOne }] : []),
    { name: 'po_dietary_pills', label: 'Plus one dietary restrictions', type: 'pills', multi: true, options: DIETARY_PILLS, showIf: hasPlusOne },
    { name: 'po_dietary_other', label: 'Describe the restriction', type: 'text', showIf: (v) => hasPlusOne(v) && (v.po_dietary_pills || []).includes('Other') },
    { type: 'heading', label: 'Address and notes' },
    { name: 'mailing_address', label: 'Postal address', type: 'textarea', placeholder: 'For save the dates and invitations. Include the country if they are overseas.', rows: 3 },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Anything about this guest' },
  ];
}

/** A Guest record into the sheet's values. */
export function guestInitial(g) {
  const d = parseDietary(g?.dietary_restrictions || '');
  const po = parseDietary(g?.plus_one_dietary_restrictions || '');
  return {
    name: '', email: '', phone: '', category: '', table_assignment: '', rsvp_status: 'pending', meal_choice: '', plus_one: false, plus_one_name: '', plus_one_email: '', plus_one_meal_choice: '', mailing_address: '', notes: '',
    ...(g || {}),
    tags: Array.isArray(g?.tags) ? g.tags : [],
    dietary_pills: d.selected, dietary_other: d.other, po_dietary_pills: po.selected, po_dietary_other: po.other,
  };
}

/** The sheet's values into the fields the desktop submits. */
export function guestPayload(v, country = 'AU') {
  const iso = v.phone_country || country;
  const phone = v.phone ? (toE164(v.phone, iso) || v.phone) : '';
  const out = {
    name: (v.name || '').trim(), email: (v.email || '').trim(), phone, category: v.category || '', table_assignment: v.table_assignment || '', rsvp_status: v.rsvp_status || 'pending',
    meal_choice: v.meal_choice || '', tags: v.tags || [], dietary_restrictions: dietaryToString(v.dietary_pills, v.dietary_other),
    // GuestForm.jsx keeps the plus-one details on the record when the box is unticked.
    plus_one: !!v.plus_one, plus_one_name: v.plus_one_name || '', plus_one_email: (v.plus_one_email || '').trim(), plus_one_meal_choice: v.plus_one_meal_choice || '',
    plus_one_dietary_restrictions: dietaryToString(v.po_dietary_pills, v.po_dietary_other),
    mailing_address: v.mailing_address || '', notes: v.notes || '',
  };
  return out;
}
