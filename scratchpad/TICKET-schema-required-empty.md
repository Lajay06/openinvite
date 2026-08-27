# TICKET — `"required": []` across every entity schema

**Report-first. Not to be patched.** This is a schema question, which is the
advisor's boundary, and it wants a proper look rather than a fix in passing.

## The finding

`base44/entities/WeddingDetails.jsonc` declares `"required": []`. Nothing is
mandatory — not `couple1Name`, not `weddingDate`, not anything.

Surfaced while designing the derived wedding address: the collision ladder
climbs real facts about the wedding (year → month → day), and a record with no
date has no rungs to climb, so it falls straight to the number — the ugly case
the ladder exists to make rare.

## Why it is bigger than the address

Three consequences, all observed rather than theorised:

1. **`create({ polls })` makes a wedding.** 23 call sites do
   `if (detailsId) update else create`, most with a single-key fragment. There
   is **no onboarding route guard** — checked `App.jsx`, `Layout.jsx`,
   `AuthContext.jsx`. So a record can exist with no names, no date, nothing.
2. **The codebase is full of defensive fallbacks** because every read must
   assume every field may be absent. `details?.x || 'Your Names'` is everywhere,
   and each one is a small decision about what to show instead of the truth.
3. **The ladder can collapse**, per above.

## What it is NOT

Not a request to add `required` to WeddingDetails. Base44's
`update_entity_schema` is full-replace, and making a field required against
19 existing production rows has consequences this ticket does not presume to
know. The question is what the entity should guarantee, not how to force it.

## Suggested first question

Which fields does a wedding need before it is a wedding, as opposed to a draft?
That distinction may be the real answer — a `status` rather than a `required`.
