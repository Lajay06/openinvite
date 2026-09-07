# TICKET — Vows & speeches: per-item PIN lock (BLOCKED on a schema addition)

**Filed** 2026-09-07, by the unattended run, package P10.
**Status** BLOCKED. No product code was written. This is the report the
package's own instruction asks for, and the reason it stopped.

## The instruction

> Per vow/speech: a Lock action; locking sets a 4–6 digit PIN for THAT item; a
> locked item shows a placeholder and an Unlock field; correct PIN reveals it
> for the session. Each partner locks their own. **Storage: report FIRST what
> the vows entity has; store only a salted hash of the PIN in an existing text
> field if one is unused, else STOP this package and file it as a schema
> addition — never store a PIN in clear.** No email/reset flow in this PR.

## What the entity has

`base44/entities/VowSpeech.jsonc` declares **five** properties, and that is all:

| field | type | what it is | used by the UI? |
|---|---|---|---|
| `title` | string | "My vows to Sara" | **yes** — the list and the header |
| `type` | string | `vow` \| `speech` | **yes** — the two tabs filter on it |
| `author` | string | who delivers it | **yes** — the list row and the header |
| `content` | string | the text itself | **yes** — the reading pane and print |
| `notes` | string | private notes / prompts | **yes** — `VowsSpeeches.jsx:228` renders it in its own panel, and `VowSpeechEditor.jsx:65` writes it |

RLS is owner-scoped on read, update and delete (`created_by_id = {{user.id}}`).

**There is no unused text field.** `notes` is the only candidate by shape and
it is neither unused nor private-by-accident: it is a labelled, rendered,
editable field a couple already writes into. Putting a PIN hash there would
mean either colliding with the couple's own words or silently reserving part
of a field they can see and edit — and an editable field is not a place a
credential can live.

## So this package stops here

Per the instruction. Nothing was half-built: no Lock action, no PIN entry, no
placeholder state, no storage. A lock whose credential has nowhere to live is
worse than no lock, because it looks like one.

## What the owner needs to add

One field on `VowSpeech`:

```jsonc
"pinHash": {
  "type": "string",
  "description": "Salted hash of this item's 4-6 digit unlock PIN. Never the PIN itself. Empty or absent = not locked."
}
```

Notes for whoever implements it once the field exists:

- **Hash server-side, not in the browser.** A 4–6 digit PIN has at most a
  million candidates; a hash the client computes is a hash an attacker can
  recompute offline against a value they can read. This wants the same shape
  as the website password gate (`useWebsitePasswordGate`), which hashes on the
  server and never lets the plaintext ride a client-side entity write.
- **The salt goes in the stored value**, per item, so two items with the same
  PIN do not produce the same hash.
- **Reveal is per session**, in memory only — never `localStorage`, which
  would survive the couple handing their laptop to someone.
- **RLS already scopes the record to its owner**, so the PIN is a screen-lock
  against a shoulder, not an access-control boundary. Worth saying in the UI,
  so nobody believes it is more than it is.
- **No reset flow** in the first pass, per the ruling — which makes the
  "each partner locks their own" story important to get right: two people
  share one account today, so "their own" means per ITEM, not per person.

## Related

- `src/lib/websitePasswordGate` — the existing hash-on-the-server pattern.
- BASE44_PLATFORM_NOTES.md — unknown fields are accepted with 200 and dropped,
  which is why a client-side "just write it and see" approach would have
  silently produced an unlocked item that reported itself locked.
