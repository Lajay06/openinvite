/**
 * src/lib/guestImport.js
 *
 * CSV/XLSX → Guest row mapping, shared between the dashboard's
 * ImportGuestModal.jsx and the onboarding guest-list step
 * (OnboardingPathAGuestList.jsx) — one real parser, not the dashboard's
 * working column-mapped import plus a second, broken raw-line stub in
 * onboarding that took the first 4 lines of any file (header row
 * included) and stored each whole line as a guest's name.
 */
import { toE164, needsCountryCode, DEFAULT_COUNTRY } from './phoneE164.js';
import { applyStatusToEventResponses } from './statusWrite.js';

// Household, Child and Child age join the template, because a couple whose
// list has families typed them somewhere already and the only question is
// whether we read them. Household is a free label the couple chooses: rows
// sharing a non-empty value become one invitation, and the value itself is
// never shown to anyone.
export const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Plus one (Y/blank)',
  'Household', 'Child (Y/blank)', 'Child age'];

const VALID_RSVP = ['attending', 'declined', 'pending', 'maybe'];

/**
 * @param {object} row
 * @param {string} [country]
 * @param {Array}  [events]  the wedding's events, from getWeddingEvents. Given
 *   them, an imported RSVP column becomes per-event answers; given none, the
 *   row carries the flat column alone and nothing reads it. See the note at
 *   the RSVP line below.
 */
export function rowToGuest(row, country = DEFAULT_COUNTRY, events = []) {
  const name = String(row['Name'] ?? '').trim();
  if (!name) throw new Error('Name is required');

  const phoneRaw = String(row['Phone'] ?? '').trim();
  const phoneE164 = phoneRaw ? toE164(phoneRaw, country) : null;
  const phoneValue = phoneE164 || phoneRaw || undefined;
  const phoneWarning = needsCountryCode(phoneRaw, country)
    ? 'Phone needs a country code'
    : undefined;

  // Support the current 'Plus one (Y/blank)' header and older exports'
  // 'Plus one' / '+1'.
  const plusOneRaw = String(row['Plus one (Y/blank)'] ?? row['Plus one'] ?? row['+1'] ?? '').toLowerCase().trim();
  const plusOne = ['yes', 'true', '1', 'x', 'y'].includes(plusOneRaw);

  // RSVP/table/dietary are tolerated from an older-format file for backward
  // compatibility, but are no longer part of the template. Category is
  // deliberately never read from any import — set afterwards via inline or
  // bulk edit, never guessed or defaulted.
  const rsvpRaw = String(row['RSVP'] ?? '').toLowerCase().trim();
  // ── A SPREADSHEET SAYING "MAYBE" BECOMES AWAITING ───────────────────────
  //
  // Advisor ruling 2026-10-07, second pass: Maybe has left the editor because
  // the per-event status enum is pending, yes, no, and widening it is a schema
  // change. A file can still carry the word, so it is MAPPED here rather than
  // stored: the flat column gets 'pending' too, not just the rows, because a
  // stored 'maybe' nothing can display and nothing can edit is a value with no
  // way out of the record.
  //
  // THE COUPLE IS TOLD. `_maybeMapped` is preview state, stripped before the
  // guest is created along with every other underscore field, and
  // ImportGuestModal turns it into a line in the summary. Mapping somebody's
  // data without saying so is the part that would be wrong.
  // ── HOUSEHOLD, CHILD AND AGE ────────────────────────────────────────────
  //
  // THE LABEL IS NOT THE KEY. A couple types "Patel" or "Table 4 family" in
  // the Household column; grouping is by that value, and the household_id the
  // product stores is derived from it by parseGuestFile, which is the only
  // place that can see the whole file and therefore the only place that can
  // give every row with the same label one id. rowToGuest reports the label
  // and nothing more.
  //
  // TRIMMED, AND BLANK MEANS NO HOUSEHOLD, which is household.js's own rule:
  // a blank cell must not group every blank row into one enormous invitation.
  const householdLabel = String(row['Household'] ?? '').trim();

  // Y, YES, TRUE or 1, the same looseness the plus-one column already allows,
  // because a spreadsheet's "yes" column is whatever the couple typed.
  const childRaw = String(row['Child (Y/blank)'] ?? row['Child'] ?? '').trim().toLowerCase();
  const isChildRow = ['y', 'yes', 'true', '1'].includes(childRaw);

  // ONLY FOR A CHILD, AND ONLY WHOLE YEARS 0 TO 17. base44 declares child_age
  // as `number`, so the bound is this writer's job, exactly as it is in the
  // guest editor. An unreadable age is dropped rather than guessed at, and an
  // age on a row that is not a child is ignored rather than stored on an adult.
  const ageRaw = String(row['Child age'] ?? '').trim();
  const ageNum = ageRaw === '' ? null : Math.trunc(Number(ageRaw));
  const childAge = isChildRow && ageNum !== null && Number.isFinite(ageNum)
    && ageNum >= 0 && ageNum <= 17 ? ageNum : undefined;

  const maybeMapped = rsvpRaw === 'maybe';
  const rsvpStatus = maybeMapped ? 'pending'
    : (VALID_RSVP.includes(rsvpRaw) ? rsvpRaw : 'pending');
  // ── AN IMPORTED RSVP IS A PER-EVENT ANSWER NOW ──────────────────────────
  //
  // Advisor ruling 2026-10-07: nothing reads the flat column for display, so a
  // spreadsheet saying "attending" used to import a guest who then read as
  // awaiting everywhere. The column is still written below, because writers
  // may set it; this is what makes it mean something.
  //
  // THE SAME NARROW WRITE THE EDITOR USES, through the same module, so an
  // import cannot express an invitation decision the editor cannot. An
  // imported guest is new and has no entries, so in practice this creates one
  // entry per MAIN event and none for a custom event, which is the resolver's
  // own default for a guest nobody has invited to anything yet.
  //
  // NO EVENTS, NO ROWS. parseGuestFile is also called from onboarding, where
  // the wedding may not be loaded; passing none leaves the flat column alone
  // rather than inventing answers against an empty event list.
  //
  // AND A BLANK COLUMN IS NOT A CHOICE. `rsvpStatus` falls back to 'pending'
  // for an absent or unreadable value, which is right for the flat column and
  // wrong as an answer: writing two pending entries for a guest whose
  // spreadsheet said nothing about RSVP is storing data nobody entered. The
  // rows come only from a value the file actually carried.
  const rsvpGiven = VALID_RSVP.includes(rsvpRaw);   // 'maybe' included: it maps, it is not ignored
  const eventResponses = rsvpGiven
    ? applyStatusToEventResponses({ events, guest: { event_responses: [] }, status: rsvpStatus })
    : [];

  return {
    name,
    email: String(row['Email'] ?? '').trim() || undefined,
    // THE THIRD PLACE A NUMBER ENTERS THE PRODUCT, and the one with no field
    // beside it to ask a country from — a spreadsheet column is whatever the
    // couple's own address book exported. Parsed against the import's country
    // and stored in E.164 when it resolves; kept EXACTLY AS TYPED and flagged
    // when it does not, because silently rewriting a number is how "0412 345
    // 678" becomes a number that belongs to somebody else.
    //
    // A bad number never blocks the import. The name is what the row is for,
    // and a guest with an unreadable phone is still a guest — `_phoneWarning`
    // shows in the preview, `_error` would drop the row.
    phone: phoneValue,
    rsvp_status: rsvpStatus,
    ...(eventResponses.length > 0 ? { event_responses: eventResponses } : {}),
    ...(maybeMapped ? { _maybeMapped: true } : {}),
    // The LABEL travels as preview state; parseGuestFile turns it into a
    // household_id once it can see every row.
    ...(householdLabel ? { _householdLabel: householdLabel } : {}),
    ...(isChildRow ? { is_child: true } : {}),
    ...(childAge !== undefined ? { child_age: childAge } : {}),
    table_assignment: String(row['Table'] ?? '').trim() || undefined,
    plus_one: plusOne,
    plus_one_name: String(row['Plus one name'] ?? row['+1 Name'] ?? '').trim() || undefined,
    dietary_restrictions: String(row['Dietary requirements'] ?? '').trim() || undefined,
    ...(phoneWarning ? { _phoneWarning: phoneWarning } : {}),
  };
}

export async function downloadGuestTemplate() {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  XLSX.writeFile(wb, 'guest-list-template.csv');
}

/**
 * Reads a File (CSV/XLSX/XLS) and resolves to an array of parsed rows, each
 * either a valid Guest-shaped object (spread of rowToGuest's return, plus
 * _rowIndex/_error:null) or an error row (_rowIndex/_error set, placeholder
 * display fields). Rejects only on a genuinely unreadable/unparsable file.
 */
/**
 * COUNTRY IS A PARAMETER NOW, AND IT WAS ALWAYS A DECISION (Run 5 T5).
 *
 * `rowToGuest(row, country)` has taken a country since it was written, and this
 * function never passed one — so every imported number was read as Australian,
 * for everyone, silently. A US couple importing their own guest list got a file
 * of +61 numbers and no message saying so. The caller picks the country now,
 * with the same picker every other phone field uses.
 */
/**
 * ── ONE ID PER LABEL, ASSIGNED ONCE THE WHOLE FILE IS IN HAND ──────────────
 *
 * rowToGuest sees one row and can only report the LABEL a couple typed in the
 * Household column. This sees every row, so it is the only place that can give
 * each label one household_id.
 *
 * THE ID IS GENERATED, NOT THE LABEL. A label is free text: a couple may reuse
 * "Family" across two imports, or across two weddings, and a stored key should
 * not depend on what they typed. The label never reaches the Guest record.
 *
 * A LABEL USED BY ONE ROW ALONE IS NOT A HOUSEHOLD. One person is their own
 * invitation whether or not they typed a surname beside their name, and giving
 * them a key would leave a value on the row that nothing reads while the count
 * line said the same thing either way.
 *
 * EXPORTED so a guard can drive it without building a spreadsheet, which is
 * the same reason api/rsvp-submit.js exports its own decisions.
 *
 * @param {Array} parsed  rows from rowToGuest, carrying _householdLabel
 * @param {() => string} [newId]  injectable, so a guard is not random
 * @returns {Array} the same rows, with household_id on the grouped ones
 */
export function assignHouseholdIds(parsed = [], newId = null) {
  const rows = Array.isArray(parsed) ? parsed : [];
  const labelCounts = new Map();
  for (const r of rows) {
    if (!r?._householdLabel) continue;
    labelCounts.set(r._householdLabel, (labelCounts.get(r._householdLabel) || 0) + 1);
  }
  const idForLabel = new Map();
  let n = 0;
  for (const [label, count] of labelCounts) {
    if (count > 1) {
      n += 1;
      idForLabel.set(label, newId ? newId(label, n) : `hh-${Math.random().toString(36).slice(2, 10)}`);
    }
  }
  return rows.map((r) => {
    const id = r?._householdLabel ? idForLabel.get(r._householdLabel) : undefined;
    return id ? { ...r, household_id: id } : r;
  });
}

export function parseGuestFile(file, country = DEFAULT_COUNTRY, events = []) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (jsonRows.length === 0) {
          reject(new Error('File is empty or has no data rows'));
          return;
        }
        const parsed = jsonRows.map((row, i) => {
          try {
            return { ...rowToGuest(row, country, events), _rowIndex: i + 2, _error: null };
          } catch (err) {
            return { _rowIndex: i + 2, _error: err.message, name: '—', rsvp_status: '—', plus_one: false };
          }
        });
        resolve(assignHouseholdIds(parsed));
      } catch {
        reject(new Error('Failed to parse file — check it is a valid CSV or XLSX'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
