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
export const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Plus one (Y/blank)'];

const VALID_RSVP = ['attending', 'declined', 'pending', 'maybe'];

export function rowToGuest(row) {
  const name = String(row['Name'] ?? '').trim();
  if (!name) throw new Error('Name is required');

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
    phone: String(row['Phone'] ?? '').trim() || undefined,
    rsvp_status: rsvpStatus,
    table_assignment: String(row['Table'] ?? '').trim() || undefined,
    plus_one: plusOne,
    plus_one_name: String(row['Plus one name'] ?? row['+1 Name'] ?? '').trim() || undefined,
    dietary_restrictions: String(row['Dietary requirements'] ?? '').trim() || undefined,
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
export function parseGuestFile(file) {
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
            return { ...rowToGuest(row), _rowIndex: i + 2, _error: null };
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
