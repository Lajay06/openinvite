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

export const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Plus one (Y/blank)'];

const VALID_RSVP = ['attending', 'declined', 'pending', 'maybe'];

export function rowToGuest(row, country = DEFAULT_COUNTRY) {
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
  const rsvpStatus = VALID_RSVP.includes(rsvpRaw) ? rsvpRaw : 'pending';

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
export function parseGuestFile(file, country = DEFAULT_COUNTRY) {
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
        resolve(jsonRows.map((row, i) => {
          try {
            return { ...rowToGuest(row, country), _rowIndex: i + 2, _error: null };
          } catch (err) {
            return { _rowIndex: i + 2, _error: err.message, name: '—', rsvp_status: '—', plus_one: false };
          }
        }));
      } catch {
        reject(new Error('Failed to parse file — check it is a valid CSV or XLSX'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
