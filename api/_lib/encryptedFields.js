/**
 * api/_lib/encryptedFields.js — WHICH WeddingDetails FIELDS ARE CIPHERTEXT.
 *
 * One list, two readers with nothing else in common:
 *
 *   api/my-wedding-details.js  encrypts them on write, decrypts them on read
 *   scripts/lib/seedSchema.mjs  knows a seed row is the DECRYPTED response, so
 *                               these fields must not be checked as the
 *                               `string` columns the entity mirror declares
 *
 * IT IS ITS OWN FILE RATHER THAN AN EXPORT FROM THE ENDPOINT, and the reason
 * is a CI failure that a local run could not produce. Importing the handler
 * from seedSchema pulled it into the harness's import graph, so its module
 * scope — `const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY` and four
 * `_lib` imports — ran at a different point in the run, and the module was
 * already cached by the time tests/persistence/trial-server-guard.mjs imported
 * it to exercise. `my-wedding-details: expired trial + POST is REJECTED` went
 * red on the runner while every local check passed.
 *
 * The same class the guard registry already documents: several api/ modules do
 * real work at import time, so pulling one in for a constant is not free. A
 * constant belongs somewhere with no module scope worth running.
 */
export const ENCRYPTED_FIELDS = ['budget', 'contactPerson', 'emergencyContacts', 'dayVendorContacts', 'celebrant', 'license'];
