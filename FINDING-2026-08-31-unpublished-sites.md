# Finding — unpublished wedding sites were publicly reachable

**Established 2026-08-31, against production, before any fix was applied.**
Written for the owner. Every claim below states the evidence under it and the
control that proves the instrument could have returned the opposite answer.

---

## 1. What was reachable

`GET /api/wedding-by-slug?slug=<slug>` returned **HTTP 200 with wedding data for
a wedding whose `websiteEnabled` is `false`** — that is, one the couple had never
published. The guest website at `/w/<slug>` renders from that response, so the
site was viewable.

**Verified on `casey-morgan`, one of our own test records.** The two records
belonging to people outside the business were deliberately **not** fetched; the
finding is established from ours, and the record data confirms the others share
the identical shape.

### Controls, proving this is a real result and not an instrument error

| Request | Result | What it proves |
|---|---|---|
| `slug=definitely-not-a-real-slug-xyz` | **404** `Wedding not found.` | The endpoint **can** refuse. A 200 is a decision, not a default. |
| `slug=casey-morgan` (`websiteEnabled: false`) | **200**, 42 fields | Unpublished data was served. |
| `slug=john-suzanne` (published) | **200**, 32,642 bytes | The endpoint behaves identically published or not — publication was never consulted. |

---

## 2. What was exposed, exactly

For `casey-morgan`, **14 of 42 returned fields were populated**:

- `couple1Name`, `couple2Name`, `coupleNames` — **the couple's names**
- `welcomeMessage` — their own words
- `mainCeremony` — venue object (address, website, notes, placeId)
- `weddingDate`
- `enabledPages`, `activeTheme`, `activeTypography`, `activeUniverse`,
  `pageTransition`, `scrollAnimation`, `weddingStyle` — design settings
- `id`, `slug`

**The address is derived from the couple's names** (claimed at onboarding by
`syncWeddingAddress`), so it is guessable by anyone who knows them. It is not
secret, and it was never intended to be — the protection was supposed to be the
publish state.

---

## 3. What was NOT exposed — stated with the same rigour

**No guest data of any kind was reachable through this route.** Guests live on a
separate `Guest` entity that this endpoint never touches.

Probed against the live response:

| Probe | Present |
|---|---|
| `@` (any email address) | **no** |
| `guest_` (any guest record field) | **no** |
| `rsvp_status` | **no** |
| `attending` | **no** |
| `dietary` | **no** |
| `table_assignment` | **no** |
| `plus_one` | **no** |
| `phone` | key present, **value `null`** — `mainCeremony.phone`, the venue's, unset |

**And the endpoint has an explicit allow-list**, `GUEST_SAFE_WEDDING_FIELDS`,
plus a second defensive `NEVER_RETURN_FIELDS` layer excluding:
`websitePassword`, `emergencyContacts`, `dayVendorContacts`, `contactPerson`,
`celebrant`, `license`.

> **The distinction that matters if anyone has to be told: their NAMES and their
> CEREMONY VENUE were visible. Their GUEST LIST was not.** No guest's name,
> email, RSVP, dietary requirement or table was reachable by this route.

---

## 4. Who was affected

**11 records** carried a slug with `websiteEnabled: false`.

- **9 are ours** — test accounts (`la.jay06+*`, `uri.jay09`, `jaygalaxy23`).
- **2 are not:**
  - `jay-ella` — `gowdeman@hotmail.com`
  - `gow-deepa` — `gow.jay22@gmail.com`

Both are people known to the owner. **Neither record was fetched, modified or
swept** during this investigation.

---

## 5. For how long — partially established, and said so

`api/wedding-by-slug.js` was **first committed 2026-08-26**, and
`src/lib/weddingBySlug.js` the same day. **`websiteEnabled` has never appeared
anywhere in `api/`** at any commit — so no version of this endpoint has ever
gated on publication.

**The honest limit:** this establishes the endpoint has been ungated for its
entire life, from **2026-08-26**. It does **not** establish how the guest site
resolved *before* that date, or whether an equivalent hole existed under a
different mechanism. That would need a deeper history read, and it is stated as
unknown rather than assumed either way.

**No access logs were consulted**, so whether anyone actually fetched these
addresses is unknown. Vercel's logs could answer it for the retention window.

---

## 6. Why the interface said otherwise

The dashboard reads `websiteEnabled` and shows *"Your website is not published
yet"* with a **Publish** button (`StudioShareTab.jsx:128`, `PublishModal.jsx:158`).
That state was true in the dashboard and false on the internet.

**The interface reported a state the system did not have.**

---

## 7. The fix

`api/wedding-by-slug.js` refuses when `websiteEnabled` is not true, before
`pickGuestSafeFields`.

**Confirmed safe against the live data before shipping:** all **7** records with
`websiteEnabled: true` keep serving, including `florida-john` — a real couple's
published site — and the `john-suzanne` fixture.

**Preview is deliberately NOT restored by the same change.** The endpoint accepts
an `isPreview` flag, but **a flag the caller sets is not a gate** — anyone can
pass it, so honouring it would move the hole rather than close it. Restoring the
couple's own preview requires proving the caller owns the record, which is
authentication and is a separate change.

> **A data leak is never held open to keep a feature working.**
