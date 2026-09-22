/**
 * src/mobile/lib/greeting.js
 *
 * WHO THE APP GREETS, and it is never an email address.
 *
 * The desktop prints the couple's own names (coupleDisplayName, the one
 * owner of those names) and nothing else. Home used to fall back to
 * `user.full_name`, which Base44 fills with the email's local part when an
 * account is created without a name — so a real couple with a full wedding
 * on desktop was greeted "Hi jaygalaxy23" on the phone.
 *
 * The rule: the wedding's own names first, exactly as the desktop resolves
 * them; then the account's name, but only when it is a name someone typed
 * rather than the email in disguise; then nothing, and the screen says
 * plain "Hi".
 */
import { coupleNameParts } from '@/lib/coupleNames';

/**
 * True when `name` is just the local part of `email`. Compared with
 * everything but letters and digits removed, so "jay.galaxy23",
 * "jaygalaxy23" and "Jay_Galaxy23" all read as the same address.
 */
export function looksLikeEmailPrefix(name, email) {
  const n = String(name || '').trim();
  if (!n) return false;
  if (n.includes('@')) return true;
  const local = String(email || '').split('@')[0];
  if (!local) return false;
  const bare = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !!bare(n) && bare(n) === bare(local);
}

/**
 * The first name Home greets, or '' when the app does not know one yet.
 * `details` is the WeddingDetails record; `user` the signed-in account.
 */
export function greetingName(details, user) {
  const [first] = coupleNameParts(details || {});
  if (first) return first.trim().split(/\s+/)[0];
  const full = String(user?.full_name || '').trim();
  if (!full || looksLikeEmailPrefix(full, user?.email)) return '';
  return full.split(/\s+/)[0];
}
