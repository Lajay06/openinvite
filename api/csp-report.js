/**
 * POST /api/csp-report
 *
 * Collector for the Content-Security-Policy-Report-Only header set in
 * vercel.json. Browsers POST a violation report here whenever a resource
 * would have been blocked under the policy being trialled. This endpoint
 * only logs — it never enforces anything — so the team can grep Vercel
 * function logs for "[csp-report]" to see what real traffic would break
 * before the policy is ever switched from Report-Only to enforced.
 *
 * Browsers send Content-Type: application/csp-report (not application/json),
 * which Vercel's Node runtime does not auto-parse, so req.body arrives as a
 * raw Buffer/string here rather than a parsed object.
 *
 * No auth, no CORS needed — the browser sends this same-origin per the
 * report-uri directive.
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Loose per-IP cap — a single page load can fire several violation
  // reports at once (one per blocked resource), so this only guards
  // against sustained log-flooding, not normal bursts.
  const ip = getClientIp(req);
  const { limited } = checkRateLimit(ip, 'csp-report', 60);
  if (limited) {
    return res.status(429).end();
  }

  let payload = req.body;
  if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  // Support both the legacy report-uri shape ({ "csp-report": {...} }) and
  // the newer Reporting API shape (an array of { body: {...} } entries).
  const reports = Array.isArray(payload)
    ? payload.map((r) => r.body || r).filter(Boolean)
    : payload?.['csp-report']
      ? [payload['csp-report']]
      : payload
        ? [payload]
        : [];

  for (const r of reports) {
    console.warn('[csp-report]', JSON.stringify({
      documentUri: r.documentURI || r['document-uri'],
      violatedDirective: r.violatedDirective || r['violated-directive'] || r.effectiveDirective,
      blockedUri: r.blockedURI || r['blocked-uri'],
      disposition: r.disposition,
    }));
  }

  return res.status(204).end();
}
