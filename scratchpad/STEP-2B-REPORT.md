# Step 2b — report (report-first, no code)

Prepared 2026-08-17, against main `22f0907`. Nothing here has been applied.
Read-only investigation: repo grep + one live `list_entity_schemas` call.

Step 2b encrypts the four remaining `ENCRYPTED_FIELDS` that #436 wired for
decrypt-on-read but never wrote as ciphertext: `emergencyContacts`,
`dayVendorContacts`, `celebrant`, `license`.

---

## 1. Writer inventory per field, against the #443 allowlists

### The four encrypt targets

| Field | Live plaintext shape | Sole writer | Scoped by #443? | In endpoint `WRITABLE_FIELDS`? |
|---|---|---|---|---|
| `emergencyContacts` | object `{primary, backup, venue, otherNotes}` | `EmergencyContact.jsx` | Yes (inline literal) | No |
| `dayVendorContacts` | array of `{name, phone, role}` | `EmergencyContact.jsx` | Yes (inline literal) | No |
| `celebrant` | object `{name, email, phone, title, type, notes}` | `CeremonyDetails.jsx` | Yes (named const) | No |
| `license` | object `{issuingOffice, licenseNumber, witnessesRequired, applicationDate, issueDate, expiryDate, notes}` | `CeremonyDetails.jsx` | Yes (named const) | No |

Each field has exactly **one** writer page. Both pages were scoped by #443,
so the encrypt-second ordering rule in BASE44_PLATFORM_NOTES.md ("scope every
writer first, encrypt second — never the reverse") is already satisfied.
**Step 2b is unblocked on the writer side.**

`api/my-wedding-details.js` `WRITABLE_FIELDS` is still `['budget',
'contactPerson']`. Each of the four gets added there as its page moves onto
the PUT — that is the actual Step 2b code change, plus flipping the two pages
from `WeddingDetails.update()` to the endpoint.

### Full-repo writer audit — is anything still unscoped?

I checked every `WeddingDetails.create/update` call site in `src/` (67 sites),
not just the 13 pages #443 named, to confirm no unscoped writer can clobber a
newly-encrypted field.

**Scoped and safe** — object literal or named allowlist at the call site:
the 13 pages from #443, plus `ExperienceGuideTab`, `PoliciesTab`,
`StudioAssetsTab`, `StudioShareTab`, `AttirePanel`, `AvaStudio`,
`GuestSuiteAccommodation`, `GuestSuitePolicies`, `GuestSuiteTransport`,
`Photography`, `Polls`, `QandA`, `UniverseStudio`, `StudioWebsite`
(own `WRITABLE_FIELDS`), `PublishModal` (three sites, all single-field
literals), `Music` (scoped to `{music}`), `Onboarding`
(`buildWeddingDetailsPayload` — verified it emits none of the six
encrypted fields).

**Two worth noting — not encryption hazards, but real:**

`Policies.jsx:104` and `Styling.jsx:72` both call
`WeddingDetails.create(details)` with their entire local state. Their
`update` paths are correctly scoped to `{ [sectionKey]: … }`; only the
create is full-object.

This is *not* a plaintext-leak risk: the create branch only runs when
`detailsId` is null, which means no record was loaded, which means `details`
still holds the page's initial state and cannot contain a decrypted
`budget`/`contactPerson`. It is a **duplicate-record** risk of the "Alex &
Sam" shape — if `getMyWeddingDetails()` throws or returns null while a record
actually exists, both pages will happily create a second one. Out of Step 2b
scope; logged here so it isn't rediscovered as an encryption bug.

**Consistency observation.** Only 4 of the 13 #443 pages use a named
`WRITABLE_FIELDS` const (`CeremonyDetails`, `EventDetails`,
`AvaStudioWebsite`, `StudioWebsite`). The other 9 scope inline. Both are
correct; the named form is greppable and self-documenting, the inline form
isn't. Worth normalizing on the named const when each page is next touched.

---

## 2. Mixed-row read plan, per field

The discriminator in `api/my-wedding-details.js:111`:

```js
function decryptField(value) {
  if (typeof value !== 'string') return value;   // legacy plaintext passes through
  try { return decryptPayload(value); }
  catch (err) { /* logs, returns as-is — never 500s */ }
}
```

This is only unambiguous when the field's legacy plaintext form is *never* a
string. Verified against the **live** schema (queried 2026-08-17):

| Field | Live declared type | Discriminator holds? |
|---|---|---|
| `emergencyContacts` | `object` | Yes |
| `dayVendorContacts` | `array` | Yes |
| `celebrant` | `object` | Yes |
| `license` | `object` | Yes |
| `websitePassword` | **`string`** | **No — would be ambiguous** |

All four targets are object/array-shaped, so the existing `decryptField`
needs no change and no per-field version prefix. `websitePassword` is
correctly excluded: it is string-shaped, so a stored value is
indistinguishable from ciphertext under this test. It goes to a one-way
**hash** in Step 2c, not encryption — see §3 for a 2c prerequisite found
along the way.

### Backfill: none required, same conclusion as 2a

No migration script for any of the four. Existing rows hold plaintext
objects; `decryptField` passes them through untouched. A row converts to
ciphertext the first time its page saves. The mixed state is permanent and
safe rather than a window to be closed — the same reasoning that closed 2a,
and the reason a "migrated N rows" log line would again be misleading.

Two consequences to hold in mind:

- **Anything reading these fields outside the endpoint sees ciphertext once a
  row converts.** `api/_lib/guestSafeWedding.js` already excludes all four
  from the guest allowlist, so the public site is unaffected.
  `api/collaborator-data.js` also excludes them. No other reader found.
- **The first post-declaration write materializes every newly-declared field
  as null** (canonical gotcha #5). Capture any verification diff *after* the
  first write on a row, not before.

### Verification standard

Per RULE 5, each field is verified type → Saved → **reload → painted**, and
additionally raw-queried to confirm the stored value is a string. A
write-only check passes on a half-fixed field; a paint-only check passes on
an unencrypted one. Both halves, per field, per page.

---

## 3. Spotify token deletion plan

### Where the tokens are now

`WeddingDetails.music.spotifyConnection` — `{accessToken, refreshToken,
expiresAt, displayName, imageUrl}`. Live schema description names
`api/spotify-callback.js` as writer and `api/spotify-refresh.js` /
`api/spotify-search.js` as readers.

Five findings, in the order they matter:

1. **`WeddingDetails` RLS read is wide open.** The live schema shows
   `"rls": {"create": null, "read": null, "update": {created_by_id}, "delete":
   {created_by_id}}`. #326 stopped the *anonymous guest-site* leak by
   allowlisting fields in `guestSafeWedding.js`, but that guards the API path
   only. At the entity level, any authenticated caller can still read another
   couple's row — including `music.spotifyConnection` — directly through
   `base44.entities.WeddingDetails`. This is the largest exposure here and it
   is not Spotify-specific; it is also why `budget`/`contactPerson` needed
   encrypting in the first place.

2. **The browser is a token custodian.** `api/spotify-session-fetch.js`
   returns `at`/`rt` to the client, and `Music.jsx:271` writes them back from
   the browser. The refresh token transits the browser and lands in client
   memory on every Music page load with a pending connection.

3. **Disconnect is a client-side null write with no revocation.**
   `Music.jsx:325` — `updateMusic('spotifyConnection', null)`. If the tab
   closes mid-write, the tokens stay. Nothing is revoked at Spotify, so
   deleting the stored copy *is* the entire mitigation and therefore has to be
   reliable.

4. **The refresh token doubles as a lookup key.**
   `api/_lib/spotifyAuth.js:32` queries
   `{'music.spotifyConnection.refreshToken': refreshToken}`. A long-lived
   secret in a query string is a secret in logs.

5. **No retention policy.** Connections persist indefinitely, including for
   weddings long past.

### Proposed sequence (no code written)

1. **Tighten `WeddingDetails` read RLS to `created_by_id`.** Standing
   exposure, independent of Spotify. Needs a click-through of the guest site
   and collaborator views first, since both read this entity through
   admin-key endpoints rather than directly — the expectation is no breakage,
   but that must be demonstrated, not assumed. Bouncer-adjacent: owner accept
   before merge, per RULE 2.
2. **Stop returning `rt` to the browser.** `spotify-session-fetch` writes the
   connection server-side with the admin key and returns only
   `{connected, displayName, imageUrl}`. Removes the browser from custody and
   is a prerequisite for (3) meaning anything.
3. **Move disconnect server-side.** An authenticated endpoint clears
   `spotifyConnection` so a dropped client can't strand tokens.
4. **Re-key `spotifyAuth.js`** to look up by wedding id, not refresh token.
5. **Add a purge** for connections whose wedding date has passed.

Items 2–4 are mechanical. Item 1 is the one with real blast radius and
should not be bundled with them.

---

## 4. Stale `additionalNotes` schema description — proposed change

**Current live description, verbatim:**

> Free-text ceremony notes (CeremonyDetails Notes tab). Declaring this is
> necessary but NOT sufficient — 'additionalNotes' must also be added to
> WRITABLE_FIELDS in src/pages/CeremonyDetails.jsx, which currently omits it.

The final clause is now false. #444 added `additionalNotes` to both
`WRITABLE_FIELDS` (`src/pages/CeremonyDetails.jsx:127`) and `loadData()`
(`:155`). The description reads as an open defect against fixed code.

**Proposed replacement:**

> Free-text ceremony notes (CeremonyDetails Notes tab). Written by
> src/pages/CeremonyDetails.jsx — present in both its WRITABLE_FIELDS
> allowlist and its loadData() destructuring since #444. Both halves are
> required: with only the allowlist the value saves and reloads blank.
> Distinct from the nested additionalNotes on accommodation, foodBeverage,
> weddingFavours and entertainmentDetails, which are separate per-section
> notes on their own objects.

Two notes for whoever applies it:

- The name is **overloaded**. Top-level `additionalNotes` is ceremony notes;
  four other objects carry their own nested `additionalNotes`. The
  replacement text says so explicitly, because a future reader grepping
  `additionalNotes` will hit five unrelated things.
- **The local mirror is out of sync.** `additionalNotes` exists in the live
  schema but is **absent entirely** from
  `base44/entities/WeddingDetails.jsonc`. Same class of drift #431 fixed for
  the RLS flips. Applying the description upstream without also adding the
  field to the mirror leaves the drift in place.
