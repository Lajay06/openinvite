/**
 * THE SEND IS NOT GATED ON A NUMBER NOBODY SENDS FROM.
 *
 * Owner ruling, Run 5 T9: the feature stays, the "connect" theatre goes.
 *
 * ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 *
 * The Messages page asked the couple to save their own WhatsApp number before
 * it would show them any way to message a guest. Saving it changed exactly one
 * thing: whether the button was drawn (`whatsappConnected && guestPhones[…]`).
 * It was never sent, never used to address anything, and never seen by a
 * guest. The message opens wa.me addressed with THE GUEST'S number, on the
 * couple's own device, from whichever WhatsApp account is signed in there.
 *
 * So a couple who had not "connected" saw no way to message a guest at all,
 * and the remedy the interface asked for was a fiction. What the gate was
 * pretending to say — where the message comes from — is now said in one line
 * beside the send.
 *
 * The number itself stays, for the one thing that genuinely uses it: the QR
 * code a guest scans to message the couple.
 *
 * ── WHY IT IS A BROWSER GUARD ──────────────────────────────────────────────
 *
 * "The button appears with nothing stored" is a statement about a rendered
 * page with an empty localStorage, and the bug was precisely a condition that
 * read true in the source and false on the screen. Instrument failure 8 in
 * renderHarness's header is the other half of it: until this run no seeded
 * guest had a phone number and no seeded message named a guest, so the control
 * could not be drawn in any harness — "it is not shown" was a fact about the
 * fixture.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4210';
const NUMBER = '+61499888777';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });

const openMessages = async () => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Messages`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  return page;
};

// ── ONE: nothing stored ────────────────────────────────────────────────────
{
  const page = await openMessages();

  // PRESENCE BEFORE PROPERTIES: if the seeded message is not on the page, every
  // statement below is about a row that was never rendered.
  const row = page.getByText('Cannot wait!').first();
  const rowThere = await row.count() > 0;
  check('the seeded guest message is on the page', rowThere, rowThere ? 'Grace Hopper' : 'no message row — the checks below would be vacuous');

  const stored = await page.evaluate(() => ({
    flag: localStorage.getItem('whatsapp_connected'),
    phone: localStorage.getItem('whatsapp_phone'),
  }));
  check('  and no WhatsApp number is stored for this couple', !stored.flag && !stored.phone,
    `whatsapp_connected=${stored.flag}, whatsapp_phone=${stored.phone}`);

  const send = page.getByRole('button', { name: /open in whatsapp/i });
  const sendThere = await send.count() > 0;
  check('the couple can message a guest with nothing connected', sendThere,
    sendThere ? 'the WhatsApp button is on the message row' : 'no WhatsApp button — the gate is still there');

  // The QR is the number's one real use, so with no number there is no QR.
  const qr = await page.getByRole('button', { name: /generate qr code/i }).count();
  check('  and no QR code is offered, because there is no number to encode', qr === 0, `${qr} QR button(s)`);

  if (sendThere) {
    await send.first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const note = page.locator('[data-whatsapp-send-note]');
    const noteThere = await note.count() > 0;
    const text = noteThere ? (await note.first().innerText()).trim() : '';
    check('  and the compose panel opens', noteThere, noteThere ? 'the send sheet is open' : 'nothing opened');
    check('  saying where the message actually comes from',
      /Opens in your WhatsApp app\s*—\s*messages send from the account you’re signed in to\./.test(text),
      text ? `"${text}"` : 'no note beside the send');

    const sendBtn = page.getByRole('button', { name: /^open in whatsapp$/i }).last();
    const disabled = await sendBtn.isDisabled().catch(() => null);
    check('  and the send itself is available', disabled === false,
      disabled === false ? 'enabled with no number stored' : `disabled=${disabled}`);
  }

  await page.close();
}

// ── TWO: a number stored ───────────────────────────────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Messages`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.evaluate((n) => {
    localStorage.setItem('whatsapp_connected', 'true');
    localStorage.setItem('whatsapp_phone', n);
  }, NUMBER);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);

  const banner = await page.getByText('Your WhatsApp number (for guests to message you)').count();
  check('the saved number is labelled for what it is for', banner > 0,
    banner > 0 ? 'for guests to message you' : 'the old "connect your WhatsApp" framing is back');

  const shown = await page.getByText(NUMBER, { exact: false }).count();
  check('  and the number itself is shown back', shown > 0, shown > 0 ? NUMBER : 'not displayed');

  const qrBtn = page.getByRole('button', { name: /generate qr code/i });
  const qrThere = await qrBtn.count() > 0;
  check('the QR code is offered once there is a number', qrThere, qrThere ? 'Generate QR code' : 'no QR button');

  if (qrThere) {
    await qrBtn.first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // The QR is drawn from the stored number: the image's own label names it.
    const label = await page.getByRole('img', { name: new RegExp(`WhatsApp QR code for \\${NUMBER}`) }).count();
    check('  and it encodes THAT number', label > 0,
      label > 0 ? `QR for ${NUMBER}` : 'the QR is not built from the stored number');
  }

  // The gate's removal does not run the other way either.
  const send = await page.getByRole('button', { name: /open in whatsapp/i }).count();
  check('  and messaging a guest still works with a number stored', send > 0, `${send} WhatsApp button(s)`);

  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
