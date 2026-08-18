/**
 * src/lib/dashboardSources.js
 *
 * Loads a named set of data sources and classifies the outcome, so a page can
 * tell an outage apart from an empty account.
 *
 * WHY IT IS A SEPARATE, INJECTABLE MODULE
 * ---------------------------------------
 * DailyUpdate's first attempt at this wrapped each loader in .catch() inline.
 * It shipped, CI passed, and it did not work — the loaders it was catching
 * never rejected, because resolveMyWedding.js converts failure to []/null one
 * layer down. The structural CI pins could not see that: they asserted the page
 * SAID the right thing, not that the system DID it.
 *
 * Taking the loaders as arguments is what makes the behaviour testable without
 * a browser, a network, or the Base44 SDK. The test injects a rejecting loader
 * and asserts the classification, which is the assertion that would have caught
 * that bug. Structural pins may remain; they are not the proof.
 *
 * Pair it with the { strict: true } option on resolveMyWedding's loaders —
 * without that, the promises handed in here resolve to empty values and this
 * module correctly reports "ok", because nothing failed as far as it can tell.
 */

/**
 * @param {Record<string, () => Promise<any>>} loaders  name -> loader thunk
 * @returns {Promise<{data: Record<string, any>, failed: string[], status: 'ok'|'partial'|'error'}>}
 *   status 'error'   every loader failed — an outage; render nothing rather than a false empty state
 *          'partial' some failed — render, but say which are missing
 *          'ok'      all succeeded; an empty result now genuinely means empty
 */
export async function loadDashboardSources(loaders) {
  const names = Object.keys(loaders);
  const failed = [];
  const data = {};

  await Promise.all(names.map(async (name) => {
    try {
      data[name] = await loaders[name]();
    } catch (err) {
      // Logged with the source name so a production failure is findable in the
      // console even when the UI has degraded gracefully.
      console.warn(`[dashboardSources] ${name} failed to load:`, err?.message || err);
      failed.push(name);
      data[name] = null;
    }
  }));

  // Stable order regardless of which promise settled first — the names appear
  // in user-facing copy, and "vendors, budget" one render and "budget, vendors"
  // the next reads like a second, different failure.
  failed.sort((a, b) => names.indexOf(a) - names.indexOf(b));

  const status = failed.length === 0
    ? 'ok'
    : failed.length === names.length ? 'error' : 'partial';

  return { data, failed, status };
}
