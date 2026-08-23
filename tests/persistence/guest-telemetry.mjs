/**
 * Guest telemetry scope.
 *
 * The audit found the provisional severity inverted: PostHog loaded on guest
 * routes but sent nothing, while Sentry was actively transmitting -- session
 * envelopes plus a 108 KB replay segment on an error-free guest page, because
 * replaysSessionSampleRate was 0.1 everywhere.
 *
 * These assert on CONFIGURATION, deliberately. The audit could only observe a
 * 20-second window, and a batched flush after it would have been invisible;
 * "we watched and it was quiet" is not the same claim as "it cannot fire".
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { isGuestRoute } from '../../src/lib/isGuestRoute.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const ANALYTICS = readFileSync(resolve(__dir, '../../src/lib/analytics.js'), 'utf8');
const SENTRY = readFileSync(resolve(__dir, '../../src/lib/sentry.js'), 'utf8');

export async function runGuestTelemetry() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest telemetry — guests never signed up for anything:\n');

  // the predicate itself
  check('guest paths are recognised', isGuestRoute('/w/john-suzanne') && isGuestRoute('/w/x/rsvp'), '/w/ matched');
  check('  couple and marketing paths are not',
    !isGuestRoute('/dashboard') && !isGuestRoute('/') && !isGuestRoute('/pricing'), 'not matched');
  check('  a path merely containing /w/ later is not a guest route',
    !isGuestRoute('/dashboard/w/x'), 'anchored at the start');

  // PostHog: absence, not silence
  check('PostHog is not INITIALISED on guest routes (no script, no config fetch)',
    /const analyticsEnabled = !!key && !isGuestRoute\(\);/.test(ANALYTICS), 'init gated');
  check('  every capture path is gated on the same flag, not just init',
    (ANALYTICS.match(/if \(!analyticsEnabled\) return;/g) || []).length >= 2,
    `${(ANALYTICS.match(/if \(!analyticsEnabled\) return;/g) || []).length} guarded functions`);
  check('  the old key-only guard is gone', !/if \(!key\) return;/.test(ANALYTICS), 'no bare key guard');

  // Sentry: error reporting stays, session replay does not
  check('Sentry still initialises on guest routes (errors matter everywhere)',
    !/isGuestRoute\(\)[\s\S]{0,40}Sentry\.init/.test(SENTRY) && /Sentry\.init\(/.test(SENTRY), 'unconditional init');
  check('session replay is ZERO on guest routes',
    /replaysSessionSampleRate: isGuestRoute\(\) \? 0 : 0\.1/.test(SENTRY), '0 on /w/, 0.1 elsewhere');
  check('  error-triggered replay still fires everywhere',
    /replaysOnErrorSampleRate: 1\.0/.test(SENTRY), '1.0');

  // performance tracing follows replay's shape
  check('performance tracing is ZERO on guest routes',
    /tracesSampleRate: isGuestRoute\(\) \? 0 : 0\.2/.test(SENTRY), '0 on /w/, 0.2 elsewhere');
  check('  dashboard tracing is unchanged at 0.2', /: 0\.2/.test(SENTRY), '0.2 retained');

  // masking, pinned not inherited
  for (const opt of ['maskAllText', 'blockAllMedia', 'maskAllInputs']) {
    check(`  ${opt} is pinned explicitly`, new RegExp(`${opt}: true`).test(SENTRY), 'true');
  }
  check('  masking applies to COUPLE replays too, not only guests',
    !/isGuestRoute[\s\S]{0,80}maskAllText/.test(SENTRY), 'masking is unconditional');

  return results;
}
