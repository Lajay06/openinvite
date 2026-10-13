/**
 * scripts/lib/apiResponseCopy.mjs
 *
 * WHAT AN api/ ENDPOINT SAYS BACK TO A PERSON, pulled out of the source so
 * three guards can ask the same question of it.
 *
 * ── WHY FIELD-SCOPED AND NOT WHOLE-FILE ───────────────────────────────────
 *
 * The copy guards take whole files under src/pages, src/components and src/lib.
 * Pointing them at api/ the same way would flag SQL-ish identifiers, Base44
 * field names, log lines and 1,200 lines of header prose per file. Owner ruling
 * 2026-10-13 is narrower and better: the scope is "user-facing strings returned
 * by api/*.js, any message, error or toast field in a response body". So the
 * unit is the FIELD, not the file.
 *
 * ── WHAT COUNTS, AND WHAT THIS CANNOT SEE ─────────────────────────────────
 *
 * This is a regex reader, not a parser, and it says so rather than implying
 * completeness. It finds a quoted literal assigned to one of the named fields,
 * on one line. It does NOT find a string built across several lines, a message
 * held in a variable and passed in later, or one assembled by a helper. Every
 * finding it reports is real; the absence of a finding is not proof.
 *
 * That trade is deliberate. The alternative is parsing every api file with a
 * real JS parser to resolve variables, which buys completeness for a class of
 * message this repo does not currently write, and the guard would still have to
 * be read by a person. A guard that is honest about its reach beats one that
 * implies it has none.
 */

/** The response fields a person actually reads. */
export const USER_FACING_FIELDS = ['error', 'message', 'toast', 'detail', 'hint', 'title'];

/**
 * Every secret-shaped environment variable this repo reads. Named rather than
 * matched by shape (`/[A-Z_]{8,}/` would flag HTTP header names and entity
 * constants), so a new one has to be added here on purpose.
 */
export const SECRET_ENV_NAMES = [
  'APP_HASH_KEY', 'APP_ENC_KEY', 'COLLAB_HASH_KEY',
  'BASE44_ADMIN_KEY', 'BASE44_TEST_EMAIL', 'BASE44_TEST_PASSWORD',
  'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET', 'RSVP_TOKEN_KEY', 'CALENDAR_FEED_SECRET',
  'GOOGLE_PLACES_API_KEY', 'PEXELS_API_KEY', 'CLOUDINARY_URL',
];

const fieldAlternation = () => USER_FACING_FIELDS.join('|');

/** A line that is only a comment carries no response copy. */
const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

/**
 * @param {string} src a file's contents
 * @returns {Array<{line: number, field: string, text: string}>} the literals
 *   assigned to a user-facing response field
 */
export function responseStrings(src) {
  const out = [];
  const lines = String(src || '').split('\n');
  const re = new RegExp(`\\b(${fieldAlternation()})\\s*:\\s*(['"\`])((?:\\\\.|(?!\\2)[\\s\\S])*)\\2`, 'g');
  for (let i = 0; i < lines.length; i += 1) {
    if (isCommentLine(lines[i])) continue;
    for (const m of lines[i].matchAll(re)) {
      // A template literal carrying an interpolation is exception-shaped and is
      // reported by exceptionSites instead; its static halves are not copy.
      if (m[2] === '`' && /\$\{/.test(m[3])) continue;
      out.push({ line: i + 1, field: m[1], text: m[3] });
    }
  }
  return out;
}

/**
 * Exception text reaching a response body. OWNER RULING 2026-10-13: banned
 * outright, in every api/ response body, with no list of public endpoints to go
 * stale. The server logs the exception; the body returns a fixed code and a
 * calm line.
 *
 * This is the shape that showed `APP_ENC_KEY is not set...` to a giver: the
 * message was written for a log, and an endpoint echoed it.
 *
 * @returns {Array<{line: number, code: string}>}
 */
export function exceptionSites(src) {
  const out = [];
  const lines = String(src || '').split('\n');
  const fields = fieldAlternation();
  const patterns = [
    // error: err.message            and  error: String(err)
    new RegExp(`\\b(?:${fields})\\s*:\\s*(?:[A-Za-z_$][\\w$]*\\.(?:message|stack)\\b|String\\(\\s*(?:err|error|e)\\b)`),
    // error: `... ${err.message} ...`
    new RegExp(`\\b(?:${fields})\\s*:\\s*\`[^\`]*\\$\\{[^}]*\\b(?:err|error|e)\\b[^}]*\\}`),
    // error: err.message || String(err)
    new RegExp(`\\b(?:${fields})\\s*:\\s*[A-Za-z_$][\\w$]*\\.message\\s*\\|\\|`),
  ];
  for (let i = 0; i < lines.length; i += 1) {
    if (isCommentLine(lines[i])) continue;
    if (patterns.some((p) => p.test(lines[i]))) out.push({ line: i + 1, code: lines[i].trim() });
  }
  return out;
}

/**
 * @param {string} text
 * @returns {string[]} the secret env names named in it
 */
export function envNamesIn(text) {
  return SECRET_ENV_NAMES.filter((n) => String(text || '').includes(n));
}
