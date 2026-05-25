/**
 * Crisp live support chat wrapper.
 *
 * Required Vercel env var:
 *   VITE_CRISP_WEBSITE_ID  — from Crisp dashboard → Settings → Website Settings → Setup → Website ID
 *
 * All exports are safe no-ops when VITE_CRISP_WEBSITE_ID is not set,
 * so the widget simply doesn't load in local dev or environments without the ID.
 */

import { Crisp } from 'crisp-sdk-web';

const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;

if (websiteId) {
  Crisp.configure(websiteId);
}

/**
 * Identify the logged-in user in Crisp so support agents know who they're
 * talking to. Call this immediately after a successful login.
 * @param {string} email
 * @param {string} [name]
 */
export function identifyUser(email, name) {
  if (!websiteId) return;
  if (email) Crisp.user.setEmail(email);
  if (name)  Crisp.user.setNickname(name);
}

/**
 * Clear the Crisp session — call this on logout so the next visitor
 * starts a fresh anonymous session instead of inheriting the previous user.
 */
export function resetSession() {
  if (!websiteId) return;
  Crisp.session.reset();
}

/** Programmatically show the chat widget. */
export function show() {
  if (!websiteId) return;
  Crisp.chat.show();
}

/** Programmatically hide the chat widget. */
export function hide() {
  if (!websiteId) return;
  Crisp.chat.hide();
}
