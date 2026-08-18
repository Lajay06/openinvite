/**
 * tests/persistence/retry-policy.mjs
 *
 * The migration script's retry policy. Pins that a retry loop can never mask
 * a real rejection.
 */
import { pass, fail } from './_shared.mjs';
import { shouldRetry, backoffMs, RETRYABLE_STATUSES } from '../../scripts/lib/retryPolicy.mjs';

export async function runRetryPolicy() {
  const results = [];
  const MAX = 4;

  results.push(shouldRetry({ status: 429 }, 0, MAX)
    ? pass('retry policy — 429 is retried', 'transient')
    : fail('retry policy — 429 is retried', 'true', 'false'));

  // Every status that must NOT be retried, because each is a verdict.
  const verdicts = [400, 401, 403, 404, 409, 422, 500, 502, 503];
  const wronglyRetried = verdicts.filter(s => shouldRetry({ status: s }, 0, MAX));
  results.push(wronglyRetried.length === 0
    ? pass('retry policy — no non-429 status is ever retried', `${verdicts.length} verdict statuses checked`)
    : fail('retry policy — no non-429 status is ever retried', 'none retried',
           `retried: ${wronglyRetried.join(', ')} — a retry here masks a real rejection`));

  results.push(!shouldRetry({ status: 429 }, MAX, MAX)
    ? pass('retry policy — retries are bounded', `stops at ${MAX}`)
    : fail('retry policy — retries are bounded', 'stop', 'unbounded'));

  results.push(!shouldRetry(new Error('network down'), 0, MAX) && !shouldRetry(null, 0, MAX)
    ? pass('retry policy — an error with no HTTP status is not retried', 'not a transport verdict')
    : fail('retry policy — an error with no HTTP status is not retried', 'false', 'true'));

  const b = [1, 2, 3, 4].map(a => backoffMs(a, 150));
  results.push(b.every((v, i) => i === 0 || v > b[i - 1]) && b[0] === 300
    ? pass('retry policy — backoff grows exponentially', b.join('ms, ') + 'ms')
    : fail('retry policy — backoff grows exponentially', 'increasing', b.join(',')));

  results.push(RETRYABLE_STATUSES.length === 1 && RETRYABLE_STATUSES[0] === 429
    ? pass('retry policy — 429 is the ONLY retryable status', 'exactly one')
    : fail('retry policy — 429 is the ONLY retryable status', '[429]', JSON.stringify(RETRYABLE_STATUSES)));

  return results;
}
