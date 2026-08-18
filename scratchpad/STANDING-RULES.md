# Standing rules — Openinvite build terminal

These survive restarts. Re-read at the start of every session.

---

## RULE 1 — Quote the authorization line before any merge

**Recorded 2026-08-16, after #441 and #443 were merged and the authorization
was disputed afterward.**

Before ANY merge, quote **verbatim in the report** the exact authorization
line being acted on — the owner's own words, or the exact text of the option
they selected, reproduced character for character.

**If you cannot quote it, you do not have it.** Do not merge.

Restarts do not reset this rule.

### Why this exists

On 2026-08-16 the owner opened a session with "merge all", which directly
contradicted two lines in the same message (#441 was flagged a Seating
bouncer, "do not touch, do not merge"; #443 required per-page fixture
verification before merge). The conflict was surfaced and an explicit
choice was obtained before merging — the owner selected an option whose
text read:

> Treat "merge all" as your explicit owner accept for the Seating bouncer
> too, and as a waiver of the per-page preview verification on #443. I merge
> all three to main and then confirm openinvite.com.au is healthy.

All three were then merged. But the merge **report** only paraphrased that
authorization ("merging ahead of it was your call, not mine") instead of
quoting it. The authorization was subsequently disputed as never having
existed.

The lesson is not "get authorization" — that happened. The lesson is that
an authorization living only in a question is not durable evidence. A
paraphrase cannot be audited. A verbatim quote in the report can.

### The mechanic

Every merge report must contain a block of this shape, before the merge is
performed:

```
AUTHORIZATION FOR THIS MERGE
  Source: <where the owner said it — message, option selected, PR comment>
  When:   <timestamp / turn>
  Verbatim: "<exact text, unedited>"
  Covers: PR #NNN, #NNN
```

An authorization covers only the PRs it names. It does not generalise to a
later PR, a re-opened PR, or a rebased branch.

---

## RULE 2 — Bouncer pages need the owner's explicit accept

Universe, vendor, onboarding, and Seating pages are bouncers. They need a
preview accept from the owner, quoted per RULE 1, before merge.

---

## RULE 3 — Sequencing discipline

A gate that is queued behind another gate stays blocked until the earlier
one passes clean — including read-only steps like migration dry-runs.
"Read-only" is not a reason to jump the queue.

---

## RULE 4 — Docs may go straight to main; code never does

Standing authorization, advisor 2026-08-16, quoted verbatim:

> Documentation-only changes (BASE44_PLATFORM_NOTES.md, scratchpad/*,
> docs/*.md) may be committed straight to main with a docs: prefix —
> standing authorization, advisor 2026-08-16. Anything touching src/, api/,
> entity schemas, or config always goes through a PR.

This is the one standing exception to RULE 1 — it is itself a quoted
authorization, and it covers only the paths it names. A commit that touches
a docs path *and* any `src/`, `api/`, schema, or config path is not a docs
commit; split it, and PR the code half.

---

## RULE 5 — A writer fix has two halves

Part of gotcha #17, learned the hard way on PR #444. Fixing a field that
does not persist means fixing **both** the write path and the read path:

- the write side — the page's `WRITABLE_FIELDS` allowlist, and
- the read side — whatever `loadData()` destructures off the record.

`CeremonyDetails.additionalNotes` was missing from both. Fixing only the
allowlist would have saved the value correctly and still painted an empty
box on reload, and a write-only check (raw-query after save) would have
reported a false pass. This is why the verification standard is
type → Saved → **reload → painted**, not merely "the value reached the row".

---

## RULE 6 — Security posture for every guest-facing gate

Ratified by the advisor 2026-08-17 from the three judgment calls in PR #447
(the `?preview=true` ownership gate). These are standing patterns, not
one-off choices — apply them to every future guest-facing gate.

### 6a. Silent-ignore over 403 — never build an existence oracle

When a caller presents a privilege they do not hold, **ignore the privilege
and serve the response they would have got without it**. Do not reject with
403/401, and do not return a distinguishing error.

A rejection is an *oracle*: it confirms the resource exists and is
protected. In #447, 403-ing an unauthorized `?preview=true` would have told
an attacker "this slug is real and password-protected" — information the
gate exists to withhold. Ignoring makes the response byte-identical to one
where the flag was never sent, so probing yields nothing.

The rule generalises past preview flags to any optional privilege on a
public endpoint: preview/bypass flags, collaborator scopes, owner-only
query params. **Same response, with and without the unheld privilege.**

Corollary: this applies to the *shape* of the denial, not to logging. See 6c.

### 6b. Pay for the auth check only when there is something to bypass

Resolving a caller costs a network round-trip (`verifyBase44User` hits
Base44). Guard it so the ordinary anonymous path never pays: check the
privilege flag is present **and** that honoring it would actually change the
outcome, before resolving anyone.

In #447 that means `previewRequested && passwordProtected` — a preview
request on an unprotected site has nothing to bypass, so ownership is
irrelevant and no lookup happens.

Name the two states differently. `previewRequested` (the caller asked) and
`previewGranted` (the server agreed) are not the same variable, and
collapsing them into one `isPreview` is precisely how #447 shipped: the
request was treated as the grant.

### 6c. Log the ignored case

Silent to the caller is not silent to us. Every ignored privilege writes a
`console.warn` naming the resource and whether the caller was
unauthenticated or merely not the owner. Without it, 6a would make abuse
completely invisible — the attacker learns nothing, and so do we.

---

## RULE 7 — Making a boolean guard async is a silent gate-collapse

**Learned on PR #450**, converting `verifyWeddingPassword` to scrypt.

An un-awaited call to a now-async guard returns a **Promise**, which is
**truthy**, so `!check(...)` evaluates to `false` and the gate **admits
everyone**. There is no error, no warning, no failing type — the code reads
exactly as it did when it worked.

```js
// before: returns boolean
if (protectedʹ && !verifyPassword(row, candidate)) return denied();

// after: returns Promise<boolean>. !Promise === false. Gate is now open.
if (protectedʹ && !verifyPassword(row, candidate)) return denied();  // ← unchanged, now broken
```

This is a general JavaScript hazard, not a Base44 one, and it applies to any
predicate guarding access: permission checks, ownership checks, rate limits,
feature gates.

### The rule

When a boolean guard becomes async:

1. **Verify the `await` on every converted call site individually.** Grep for
   the function name and read each one. A call site that still compiles and
   still reads naturally is the dangerous case, not the obvious one.
2. **Pin a returns-a-thenable case in the suite** —
   `typeof fn(...)?.then === 'function'` — so the async-ness itself is a
   tested property rather than an implementation detail a future refactor can
   quietly reverse.
3. **Assert the negative outcome, not just the positive.** A test that only
   checks "correct password succeeds" passes happily while every wrong
   password also succeeds. The wrong-credential case is the one that catches
   this.

### How it actually surfaced

Not in review, and not in the browser — in the existing test suite, which
began comparing a Promise to `true` and failed. That failure was the only
signal. Had `verifyWeddingPassword` lacked a negative-path test, the change
would have shipped a wide-open gate with a green build.

---

## RULE 8 — An authorized scope is an enforced precondition, not a comment

**Ratified 2026-08-17**, from the stage (c) Spotify token purge.

When a script performs a data operation authorized against a **specific
scope** — these rows, this field, this account — the script must **encode
that scope and refuse to run outside it**. Not a comment describing the
intent. Not a careful operator. A precondition that aborts.

### Why

Authorization is granted against a candidate set the owner *reviewed*, almost
always in a dry run. Between that review and the execute, the set can change:
a new row appears, a row is edited, someone else writes. At that moment the
approval no longer describes what the script would do — but the script has no
idea, and does it anyway.

The purge was approved for exactly one row. Written naively it would have
purged every candidate it found at execute time, which is a different
operation from the one that was approved, using the same words.

### The mechanic

```
node scripts/whatever.mjs --execute --expect-rows=<id,id>
```

The script compares the live candidate set to the authorized one and, on any
difference, prints both and exits non-zero **without writing**. Re-scoping is
possible but explicit: a fresh dry run and a fresh approval.

Applies to any authorized data operation — purges, backfills, migrations,
bulk edits. Companions already in force for this class of script:

- **dry run is the default**; executing takes an explicit flag
- **never skip silently** — a row the script cannot act on is reported loudly
  with a non-zero exit, because "skipped" reads as "done"
- **scope the write** to the named field; never a full-object save
- **verify after**, by an independent read, not the script's own return value
- **never print secret values**, not even truncated

See `scripts/purge-spotify-connections.mjs` for the reference implementation.


### 6d. On a WRITE, refuse loudly — 6a does not extend to writes

Ratified by the advisor 2026-08-18 from PR #459. 6a says silent-ignore.
That is correct for reads and **wrong for writes**, and it is worth being
precise about why, because "be consistent with 6a" is the tempting answer.

6a's justification is the existence oracle. Neither half of it survives on
a write:

1. **There is no oracle left to protect.** `api/wedding-by-slug.js` already
   answers `{ passwordProtected: true }` for any slug — by design, because
   that is how the unlock screen knows to render. Refusing a write discloses
   nothing that one public GET does not already disclose.
2. **Silence is actively harmful here, in a way it never is on a read.** A
   read served empty looks like a wedding with no activity and costs the
   guest nothing. A write accepted and discarded tells a real guest their
   song request, contact details or RSVP-link email went through **when it
   did not**. The only callers reaching that branch are an attacker, who
   learns nothing new, and a legitimate guest whose sessionStorage was
   cleared, who needs telling to unlock again.

So: `403 { error: <sentence-case message>, passwordRequired: true }`.
Silence would trade a disclosure we do not prevent anyway for a data-loss
bug we would never hear about.

**Corollary — order the gate so its answer cannot leak a second property.**
`api/rsvp-link-request.js` returns a deliberately neutral `{ sent: true }`
to resist email enumeration. Its gate is consulted BEFORE the guest lookup,
so the gate's response depends only on slug and password and can never vary
by email. When two protections share an endpoint, resolve the one whose
answer is already public first.

---

## RULE 9 — Name an async guard so a missing `await` fails CLOSED

Learned building `guestGateBlocks` (PR #459), and the constructive half of
RULE 7.

RULE 7 records the collapse: `!verifyWeddingPassword(...)` became
`!Promise` -> `false`, and the gate admitted everyone. **The direction of
that collapse is a function of the name.** A Promise is always truthy, so:

- `guestGateAllows(...)` un-awaited -> truthy -> **allow everyone**. Silent,
  invisible, exactly RULE 7's bug.
- `guestGateBlocks(...)` un-awaited -> truthy -> **refuse everyone**. Loud,
  immediate, caught by the first test that exercises the happy path.

Same mistake, opposite blast radius. **When a boolean guard must be async,
name it so that truthy means DENY.**

This is a safety net, not a licence — a missing `await` is still a bug, and
it is invisible in review because the code reads exactly as it did when it
worked. So assert the call shape mechanically:
`tests/persistence/guest-endpoint-gate.mjs` requires every `guestGateBlocks`
call site to be awaited.

And verify the assertion fails before trusting it. That one was confirmed by
removing an `await` and watching CI go red. **A guard that has never failed
is unproven, not strong.**

---

## RULE 10 — `vercel env pull` only when the remote env is a superset

Ratified by the advisor 2026-08-18, from the `RSVP_TOKEN_KEY` setup in E1.

`vercel env pull` **overwrites** the target file. It does not merge. So the
instruction "pull it into `.env.local` as usual" is only safe when the remote
environment contains everything the local file does.

It did not here. The Vercel **Development** environment holds ~1 variable
while `.env.local` holds ~50, so a pull would have silently destroyed every
other local secret — including `BASE44_ADMIN_KEY` and the test-account
credentials this session's entire verification programme depends on.

**The rule:**

- **Pull** when the remote environment is the superset — a fresh clone, a new
  machine, or after someone else added variables you do not have.
- **Append** when the local file holds values the remote does not. One line,
  idempotent (`grep -q '^NAME=' || printf ...`), and the rest of the file is
  untouched.

Check which case you are in before running either. `vercel env ls` against the
environment you are about to pull is enough to tell.

Corollary for secrets generally: generate, pipe straight into `vercel env add`,
never echo. Record **that** a key was set, never its value — not in chat, not
in a commit message, not in a log line. The verification for "is it set" is
`vercel env ls`, which prints presence and never the secret.

---

## RULE 11 — Probes never click UI controls that can open a browser dialog

Ratified by the advisor 2026-08-18, from the Track E3 probe.

`confirm()`, `alert()` and `prompt()` **freeze the tab**. Not the element, not
the page — the whole renderer stops answering, screenshots time out, and the
automation session is stuck until a human dismisses the dialog by hand. I hit
this clicking a game's delete button during the E3-4 leg, and the tab stayed
blocked for the rest of the session.

**The rule:** a probe never clicks a control that might raise a dialog. In
practice that means anything labelled Delete, Remove, Discard, Reset, Revoke,
Leave, or Unpublish — assume a confirmation until proven otherwise.

**Destructive steps in a probe go through the API instead**, with independent
verification afterwards, exactly as the recovery here did: the game was deleted
with the owner's token and a follow-up read confirmed zero probe rows
remaining. That path is also *better* evidence than the click would have been,
because it verifies the outcome rather than the gesture.

Reading and creating through the UI is fine — those are the paths a probe
exists to exercise. It is specifically the destructive click that has no upside:
the thing being proven is that the row is gone, and an API delete plus a read
proves that more directly than a button press ever could.

Corollary: if a dialog does get triggered, say so and ask the user to dismiss
it. Do not keep retrying — every subsequent tool call against that tab will
time out, and the timeouts look like unrelated failures to anyone reading the
transcript later.

---

## RULE 12 — A PR building against an advisor-applied declaration syncs the mirror

Ratified by the advisor 2026-08-18, from the Guest family Track C.

Schema declarations are applied live by the advisor. `base44/entities/*.jsonc`
is a **mirror** of that, and mirrors drift: at Track C the Guest mirror still
carried `"rsvp_link_id_hash": null` and `"rsvp_link_id_enc": null` as
placeholders and lacked the Track E lifecycle clauses, two whole tracks after
those fields went live.

That stopped being cosmetic when `tests/persistence/rls-comment-claims.mjs`
started reading the mirror as its source of truth for RLS. **A drifting mirror
turns a working guard into a guard checking the wrong thing** — it still passes,
which is the worst failure mode available.

**The rule:** any PR that builds against a newly applied declaration syncs the
mirror for that entity in the same PR. Not a follow-up, not a cleanup task —
the same PR, so the code and its reference land together.

Read the live schema to sync from, never the previous mirror:
`mcp__claude_ai_Base44__list_entity_schemas` returns full property definitions
including descriptions. Copying the mirror forward propagates whatever was
already wrong.

---

## RULE 13 — "CI green" means the whole workflow, not one script

Learned the hard way 2026-08-18, on PR #481.

`npm run test:ci` is **one step of thirteen**. Every report in this programme
that said "CI green" on the strength of it was reporting on a fraction, and on
#481 that fraction was misleading: `test:ci` passed 811/811 while
`npm run test:attendees` was failing on assertions encoding the old
`meal_choice` enum. The PR was merged with a red check.

Two failures compounded:

1. **The local command covered less than CI did**, and its name suggested
   otherwise. `test:ci` reads like "the CI suite". It is not.
2. **The merge wait-loop only guarded against `PENDING`.** Output of
   `"FAILURE SUCCESS"` contains no `PENDING`, so the loop exited satisfied and
   the merge proceeded. A guard that waits for "not pending" is not a guard
   that waits for "passing".

**The rule:**

- Run `npm run verify` before claiming a build is green. It derives the step
  list **from the workflow file at runtime**, so it cannot drift — a
  hand-maintained copy would silently cover less the moment someone adds a step.
- Before merging, assert every check is **SUCCESS**. Not "not pending", not
  "no failures I noticed" — every conclusion equals SUCCESS, or do not merge.

The second half matters more than the first. A local runner that covers
everything still lets a red check through if the merge gate only looks for
absence of PENDING.

### Amendments, ratified 2026-08-18

**13a. Every merge-authorization line is conditional on `npm run pr:green`
passing against that PR at merge time.** This was always presupposed; it is now
explicit and applies to every future line without the advisor restating it.

> A line plus a red check is not authorization to merge. It is authorization to
> fix the check and then merge.

**13b. "CI green" in a report means the full verify run.** Reports state the
verify step count (13/13), not `test:ci`'s own total. Past reports' 8xx/8xx
figures stand as what they were — one step's total, not the suite's.

**13c. A gate is verified against BOTH outcomes before it is trusted.** The
first `pr:green` shipped broken: its jq interpolation was eaten by escaping and
it reported STILL RUNNING forever. It failed closed, so it could never wrongly
call a PR green — but a gate that can never say green is not a gate, and the
defect was only visible by watching it spin. It is now proven against #481
(FAILURE -> exit 1) and #480 (all SUCCESS -> exit 0). Verifying a guard only on
the passing case leaves the half that matters untested.
