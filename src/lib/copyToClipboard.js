/**
 * src/lib/copyToClipboard.js
 *
 * Copying text that actually reaches the clipboard in Safari, and tells the
 * truth when it does not.
 *
 * ── THE DEFECT THIS EXISTS FOR ──────────────────────────────────────────────
 * "Copy links" on the guest list did nothing. No copy, no toast, no error. The
 * handler fetched the links, awaited the response, then called
 * `navigator.clipboard.writeText(...)` with no try/catch. Reproduced: the
 * request succeeds, the write throws, the rejection is unhandled, and the user
 * sees a button that does not respond.
 *
 * Safari requires the clipboard write to happen inside the TRANSIENT USER
 * ACTIVATION of the click. An `await` on a network round-trip spends that
 * activation, so by the time the links come back the write is denied. Chromium
 * is permissive and writes anyway, which is exactly how this survived
 * development and died on the owner's Mac.
 *
 * ── THE FIX ─────────────────────────────────────────────────────────────────
 * `ClipboardItem` accepts a PROMISE of a Blob. Handing the clipboard a promise
 * synchronously, inside the gesture, keeps the activation alive while the
 * network call resolves behind it. That is the supported Safari path, not a
 * workaround.
 *
 * `writeText` remains the fallback for engines without `ClipboardItem`.
 *
 * ── AND IT NEVER THROWS ─────────────────────────────────────────────────────
 * Callers get `{ ok, text }`. A denied clipboard is a normal outcome -- a
 * permission prompt refused, a browser that does not allow it, an insecure
 * context -- and the caller shows the text instead. Silence is the one
 * outcome this must never produce.
 */

/**
 * Copy the text a promise will resolve to, without spending the user gesture.
 *
 * @param {Promise<string>} textPromise resolves to the text to copy
 * @returns {Promise<{ok: boolean, text: string}>} never rejects
 */
export async function copyFromPromise(textPromise) {
  const safe = Promise.resolve(textPromise).catch(() => '');

  // Preferred: hand the clipboard a promise INSIDE the gesture.
  if (typeof ClipboardItem !== 'undefined' && navigator?.clipboard?.write) {
    try {
      const blob = safe.then((t) => new Blob([t ?? ''], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return { ok: true, text: await safe };
    } catch {
      // Fall through: some engines expose ClipboardItem but refuse a promise.
    }
  }

  const text = await safe;
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, text };
  } catch {
    return { ok: false, text };
  }
}

/**
 * Copy text already in hand. Same contract: resolves, never rejects.
 * @param {string} text
 * @returns {Promise<{ok: boolean, text: string}>}
 */
export async function copyText(text) {
  const value = text ?? '';
  try {
    await navigator.clipboard.writeText(value);
    return { ok: true, text: value };
  } catch {
    return { ok: false, text: value };
  }
}
