/**
 * scripts/lib/blockRemoteImages.mjs
 *
 * NO TEST RUN MAY EVER BILL THE CLOUDINARY ACCOUNT.
 *
 * Cloudinary's delivery report for the last month: 38.5 GB, of which 95.6%
 * carried the referrer `http://localhost:4173/` — our own preview server. Real
 * visitors accounted for 1.3 GB. Every marketing page loads roughly a dozen
 * photographs, `test-marketing-routes` and `prerender` both walk all fourteen
 * routes with `waitUntil: 'networkidle'` (which by definition waits for every
 * image), and both run on every build. The bill was our test loop.
 *
 * WHY FULFILL RATHER THAN ABORT. An aborted request fires the element's error
 * handler, and several components respond by hiding the image
 * (`onError={e => e.target.style.display = 'none'}`). A guard that changes what
 * the page looks like is a guard that changes what the test measures. A 1x1
 * transparent GIF loads successfully, costs nothing, and leaves every onload
 * path, layout box and `currentSrc` assertion behaving as it did.
 *
 * WHAT THIS IS NOT. It is not a network kill switch: only res.cloudinary.com is
 * intercepted, because that is the only host with a bill attached. Google
 * Places photos go through our own /api proxy and are already stubbed by the
 * harness where it matters.
 *
 * The counter is returned so a run can ASSERT zero rather than trust the route
 * was installed — see the request-count proof in the PR body.
 */

/** 1x1 transparent GIF — 43 bytes, served locally, never billed. */
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

const CLOUDINARY = /res\.cloudinary\.com/;

/**
 * Intercept every Cloudinary image request on a Playwright BrowserContext.
 *
 * @param {import('playwright').BrowserContext} context
 * @returns {{ blocked: number, urls: string[] }} live counter, mutated as the run proceeds
 */
export async function blockRemoteImages(context) {
  const counter = { blocked: 0, urls: [] };
  await context.route(
    (url) => { try { return CLOUDINARY.test(String(url)); } catch { return false; } },
    (route) => {
      counter.blocked += 1;
      if (counter.urls.length < 20) counter.urls.push(String(route.request().url()).slice(0, 90));
      return route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL });
    },
  );
  return counter;
}

/**
 * Count Cloudinary requests WITHOUT blocking them — for proving the block
 * works, and for any context that genuinely needs the real images.
 *
 * @param {import('playwright').BrowserContext} context
 */
export function countRemoteImages(context) {
  const counter = { requested: 0, urls: [] };
  context.on('request', (req) => {
    if (CLOUDINARY.test(req.url())) {
      counter.requested += 1;
      if (counter.urls.length < 20) counter.urls.push(req.url().slice(0, 90));
    }
  });
  return counter;
}
