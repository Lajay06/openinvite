/**
 * tests/persistence/notifications.mjs
 *
 * Notification entity — RLS design proof. The entity is written server-side
 * (admin key) or via guest-token paths, but must be READABLE by the
 * recipient — a created_by_id-scoped rule would hide admin-created rows
 * from the very person they're for (the exact bug class that broke
 * questionnaires before; see BASE44_PLATFORM_NOTES.md). RLS is instead
 * scoped to a custom `recipient_user_id` field via the documented
 * "data.<field>": "{{user.id}}" template syntax.
 *
 * This is the one persistence-suite file that needs a SECOND real,
 * independently-logged-in account (not just BASE44_TEST_EMAIL) to prove a
 * notification addressed to account 1 is genuinely invisible to account 2,
 * not just "unscoped so nobody sees anything" or some other coincidental
 * pass. See BASE44_PLATFORM_NOTES.md's "Registration requires real
 * email-OTP verification" section for how BASE44_TEST_EMAIL_2 came to
 * exist — reuse it, don't register a third account.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ID, api, pass, fail, login, cleanupEntity } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '..', '.env.local');
let ADMIN_KEY, EMAIL_2, PASS_2;
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key === 'BASE44_ADMIN_KEY') ADMIN_KEY = val;
    if (key === 'BASE44_TEST_EMAIL_2') EMAIL_2 = val;
    if (key === 'BASE44_TEST_PASSWORD_2') PASS_2 = val;
  }
} catch {
  // rely on shell env vars
}
ADMIN_KEY ??= process.env.BASE44_ADMIN_KEY;
EMAIL_2 ??= process.env.BASE44_TEST_EMAIL_2;
PASS_2 ??= process.env.BASE44_TEST_PASSWORD_2;

async function loginAs(email, password) {
  const auth = await api('POST', `/apps/${APP_ID}/auth/login`, { email, password });
  if (!auth.access_token) throw new Error('No access_token in login response');
  return auth.access_token;
}

export async function runNotifications(token) {
  const results = [];

  console.log('\n  Notification — recipient_user_id RLS, two real accounts:\n');

  if (!ADMIN_KEY) {
    console.log('  ⚠️  SKIPPED — BASE44_ADMIN_KEY not set in .env.local');
    return results;
  }
  if (!EMAIL_2 || !PASS_2) {
    console.log('  ⚠️  SKIPPED — BASE44_TEST_EMAIL_2/BASE44_TEST_PASSWORD_2 not set in .env.local');
    return results;
  }

  let notificationId = null;
  try {
    const me1 = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const token2 = await loginAs(EMAIL_2, PASS_2);
    const me2 = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token2);

    if (me1.id === me2.id) {
      console.log(`  ⚠️  SKIPPED — BASE44_TEST_EMAIL and BASE44_TEST_EMAIL_2 resolved to the same user id (${me1.id})`);
      return results;
    }
    console.log(`  Account 1 (recipient): ${me1.id}   Account 2 (stranger): ${me2.id}`);

    // ── Admin-key create, on behalf of account 1 ──────────────────────────
    const created = await api('POST', `/apps/${APP_ID}/entities/Notification`, {
      recipient_user_id: me1.id,
      type: 'system',
      title: '__PERSISTENCE_TEST_NOTIFICATION__',
      body: 'RLS two-account proof',
      link: '/dashboard',
      is_test: true,
    }, ADMIN_KEY);
    notificationId = created.id;
    results.push(notificationId
      ? pass('Admin-key create succeeds (create:null)', notificationId)
      : fail('Admin-key create succeeds (create:null)', 'an id', notificationId));

    // ── Positive path: account 1 (the recipient) can read it ──────────────
    const asRecipient = await api('GET', `/apps/${APP_ID}/entities/Notification`, undefined, token);
    const visibleToRecipient = asRecipient.some(n => n.id === notificationId);
    results.push(visibleToRecipient
      ? pass('Recipient sees the admin-created notification', `found ${notificationId}`)
      : fail('Recipient sees the admin-created notification', 'present in list', 'absent'));

    // ── Negative path: account 2 (a real second, unrelated account) cannot ──
    const asStranger = await api('GET', `/apps/${APP_ID}/entities/Notification`, undefined, token2);
    const visibleToStranger = asStranger.some(n => n.id === notificationId);
    results.push(!visibleToStranger
      ? pass('Second real account cannot see the notification', 'absent from list')
      : fail('Second real account cannot see the notification', 'absent', 'present'));

    // ── Recipient can mark it read (update RLS) ────────────────────────────
    const updated = await api('PUT', `/apps/${APP_ID}/entities/Notification/${notificationId}`, { read: true }, token);
    results.push(updated.read === true
      ? pass('Recipient can mark their own notification read', updated.read)
      : fail('Recipient can mark their own notification read', true, updated.read));

    // ── Stranger cannot update it (update RLS excludes non-recipients) ────
    try {
      await api('PUT', `/apps/${APP_ID}/entities/Notification/${notificationId}`, { read: false }, token2);
      results.push(fail('Second real account cannot update the notification', '403/404', '200 (wrote through!)'));
    } catch (err) {
      results.push(pass('Second real account cannot update the notification', err.message.slice(0, 60)));
    }
  } catch (err) {
    console.log(`  ❌ FAIL  Notification RLS round-trip — error: ${err.message}`);
    results.push(false);
  } finally {
    if (notificationId) await cleanupEntity(token, 'Notification', notificationId);
  }

  return results;
}
