/**
 * scripts/tour-recordings/lib/steps.mjs
 *
 * The few moves every chapter needs, so nine chapter files do not each invent
 * their own way of opening the sidebar.
 *
 * AT 390 THE SIDEBAR IS A SHEET. Every chapter that points at a sidebar row
 * has to open it first, and the desktop rows are present but off screen, so a
 * locator that matches both widths would silently aim at the hidden one. These
 * helpers take the width branch once.
 */

/**
 * A sidebar row or group header, by its exact visible label.
 *
 * VISIBLE, EXPLICITLY. At 390 the desktop sidebar is still in the document,
 * hidden, and `.first()` on its own picks that copy: the phone run then waits
 * fifteen seconds for an element that will never be shown and the recording
 * fails on a row a human can see perfectly well. The render guard records the
 * same trap in its own words ("the desktop row is hidden-but-present").
 */
export function sidebarRow(page, label) {
  return visible(page.getByText(label, { exact: true }));
}

/** The visible member of a locator set, for anything that exists twice. */
export function visible(locator) {
  return locator.filter({ visible: true }).first();
}

/** Open the phone sheet, or do nothing on a desktop width. */
export async function openSidebar(page, cursor, isPhone) {
  if (!isPhone) return;
  await cursor.click('button[aria-label="Open menu"]');
  await page.waitForTimeout(700);
}

/** Close the phone sheet if it is open. */
export async function closeSidebar(page, cursor, isPhone) {
  if (!isPhone) return;
  const close = page.locator('button[aria-label="Close menu"]').first();
  if (await close.isVisible().catch(() => false)) {
    await cursor.click('button[aria-label="Close menu"]');
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(600);
}

/** Go to a page through the sidebar, the way a couple would. */
export async function navigateVia(page, cursor, isPhone, label) {
  await openSidebar(page, cursor, isPhone);
  await cursor.click(sidebarRow(page, label));
  await page.waitForTimeout(2200);
}

/**
 * Scroll with the wheel, in steps, so the footage shows movement.
 *
 * `page.mouse.wheel(0, 900)` in one call jumps: the page repaints once and the
 * recording has a cut in it where a scroll should be.
 */
export async function wheelBy(page, total, { steps = 12, pause = 55 } = {}) {
  const each = Math.round(total / steps);
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, each);
    await page.waitForTimeout(pause);
  }
}
