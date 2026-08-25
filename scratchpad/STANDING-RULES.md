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


### RULE 13d — a self-skipping step reports SKIPPED, never PASS (2026-08-18)

`scripts/verify-all.mjs` counted a step as PASS whenever it exited 0. The
diff-based guards (`test:us-english-spelling`, `test:prerendered-freshness`)
compare against a merge base that does not exist locally, so they exit 0 after
inspecting nothing. A local run therefore reported **13/13 while two of those
steps had never looked at a single file** — and CI, which has a real base, then
failed the PR on a spelling error the local run had "passed".

The runner now prints SKIPPED for a step that produced no passing assertion and
announced it had nothing to compare against, and reports `11/13 exercised, 2
SKIPPED` rather than a flattering total.

**A local verify total must never claim coverage it did not exercise.**
`npm run pr:green` remains the only authority on diff-based steps — they only do
real work in CI. Every "13/13" reported before this date was, in truth, 11
exercised and 2 inert.

### RULE 13e — a verdict is bound to a SHA, or it is not a verdict (2026-08-25)

Observed on PR #545. `npm run pr:green 545` reported `Build & test = FAILURE`
while the run for the commit actually being merged was still queued — it had
read the conclusion of the **previous** run and presented it as the current
verdict.

That direction is merely annoying: it blocks a merge that would have passed.
**The dangerous direction is the other one.** A stale *green* read as the
current verdict would satisfy a RULE 13 authorization line that was never
earned — the advisor's line says "conditional on `npm run pr:green` exiting 0
**at merge time**", and a verdict describing an earlier commit does not
describe merge time at all. Every line issued this session carries that phrase;
this is what makes it enforceable rather than decorative.

**The rule:**

- A `pr:green` verdict is evidence only for the SHA it was computed from.
  Before merging, confirm the run whose conclusion you are quoting has
  `headSha == HEAD` of the branch being merged.
- **A verdict whose SHA does not match is NO VERDICT — not a pass, and not a
  failure.** Wait for the matching run; do not re-read the old one, and do not
  infer the new one's outcome from it.
- In practice: poll
  `gh run list --branch <b> --json databaseId,status,conclusion,headSha` and
  select on `headSha`, then re-run `pr:green` once that run is `completed`.
  Trusting the bare `pr:green` line without the SHA check is the hole.

Same family as the push-verification rule below and as RULE 13d: a check that
answers a question slightly different from the one being asked ("did some run
pass?" instead of "did *this commit's* run pass?") reads as authoritative and
is not.

---

## A toggle that swaps behaviour must name what it replaces

`weddingPolicies.stylingQuestionnaire.enabled` swaps the guest styling quiz
between two genuinely different flows — an AI one asking gender, style,
comfort, budget and notes, and a rules-based one asking events, style and
budget then showing a read-only guide. The dashboard toggle says only:
*"Show a quick 'what to wear' questionnaire on the Styling page… Guests pick
the events they're attending, their style, and their budget."*

Honest about what it ADDS. Silent about what it REMOVES.

It reached the advisor as **"the update has changed the styling quiz… gender,
budget and notes are missing or condensed"** — a regression report, escalated,
investigated as a possible bad deploy. Nothing had shipped. Someone had flipped
a switch that never told them what it cost.

**The rule: a control that changes behaviour must state the behaviour it
replaces, not only the one it introduces.** From the user's side, a control
honest about its additions and silent about its removals is indistinguishable
from an update taking something away.

Same family as the silent Ultra guards, the silently dead clipboard button and
the silently swallowed link fetch: **the user acts, something changes, and
nothing explains.** That is the shape to recognise, whatever the surface.

---

## A guard must assert the EFFECT, not the intent

`guest-typography-parity.mjs` asserted that guest files DECLARE
`typography.headingFont` / `typography.bodyFont` instead of font literals. It
passed, and reported parity, while **three routes rendered the wrong face** —
because `src/index.css` locks every element with
`* { font-family: … !important }`, which beats any inline `style`.

**A declaration something else can override is INTENT. The computed value is
EFFECT.** A guard that checks intent is a linter with an opinion: it can be
fully green while the thing it exists to protect is broken on production.

Where a guard cannot be run at the effect level, say so in its own header
rather than letting a green tick imply more than it proves.

The replacement here is `scripts/test-guest-font-effect.mjs`: it renders the
guest routes against this build and reads `getComputedStyle`. Removing the
wrapper from one page turns it red — `7× Plus Jakarta Sans (of 7)` — which is
exactly what the static probe could not see.

### RULE — when commissioning a guard, ask what would make it PASS while the defect exists

This is a pre-mortem, in one line, and it belongs in the report that proposes
the guard. Not "does it catch the bug I just fixed" — it does, that is why it
was written — but **"what is the world in which this is green and the product
is broken?"**

For the typography guard the answer was available at the time and nobody asked:
*a declaration that something else overrides.* Both the terminal and the
advisor approved it without asking, so this one is shared.

Every guard from here carries that line. `test-guest-font-effect.mjs` states
its own three: a seed whose universe faces happen to BE the product face
(guarded — the run aborts unless the expected faces differ from it), a page
that renders nothing so there is nothing to be wrong (guarded — presence
before properties), and a new route nobody adds to the list.

**That third one was DECLARED first and then CLOSED**, which is the better
ending. The advisor's push: a list a human must remember to update is the same
shape as the five UI call sites that each minted their own token before #538
replaced them with one write boundary. So the route list is now DERIVED from
`src/App.jsx` and `WEDDING_PAGES`, and a derived route with no expected string
FAILS THE RUN rather than being skipped — a route that exists is a route that
is checked.

Deriving it immediately surfaced drift nobody had noticed: the harness expected
the in-site music page's "Song requests" on a path the router actually serves
with the standalone `GuestMusic` ("Request a song"), and two routes had no
entry at all. **Declaring a limit is honest; closing it finds things.**

---

## Computed font-family measures loading; declared font-family measures intent

A production font sweep read `getComputedStyle(el).fontFamily` across a guest
page and returned **Plus Jakarta Sans on 86 of 86 elements**. That number was
true. The conclusion drawn from it — "the typography resolver is not working" —
was false, and it cost a full investigation.

The inline styles on those same elements said `font-family: Cormorant Garamond,
serif` and `font-family: Jost, sans-serif`. The resolver was correct. The
**faces were never loaded**: the page was a standalone route outside
`MultiPageWeddingWebsite`, so nothing called `loadFontFamilies`, and the browser
fell back to the inherited product face. WebKit reported the USED family, not
the declared one.

**The two measurements answer different questions:**

| Read | Answers |
|---|---|
| computed `fontFamily` | is the right font *loaded and applied* |
| the inline `style` attribute | is the right font *declared* |

A wiring bug and a loading bug are indistinguishable from the computed value
alone. **Measure both, or you cannot tell which you have** — and a page that
declares correctly while loading nothing looks exactly like a page whose
resolver is broken.

The control that separated them was the advisor's: measure a KNOWN-CORRECT page
in the same pass, same timing, same method. `/stay` registered
`[Plus Jakarta Sans, Cormorant Garamond, Jost]`; `/accommodation` registered
`[Plus Jakarta Sans]` alone. One line of evidence, and the ambiguity collapsed.

---

## A scan is only as good as its definition of the thing it scans for

The publish-parity sweep asked "which couple-facing promises have no guest-side
reader?" and got two answers wrong on the first pass:

- `mealOptions` reported as having **no guest reader**, because the scan's
  definition of "guest-facing" was `src/components/guest-website/**` plus three
  named pages — and `src/components/rsvp/` was not in it. `RSVPPage` reads
  `mealOptions` correctly and is unambiguously guest-facing.
- `showAttending` reported as **broken**, because nothing reads the field on the
  client. It is enforced server-side in `api/wedding-attendees.js` and reaches
  the guest through the API response. It works.

Neither error was findable by running the scan again. Both came from asking
what a "reader" actually is, and what "guest-facing" actually covers.

**Before trusting a sweep, write down its definition and attack the
definition** — not the results. A scan with a slightly wrong definition returns
a clean, confident, wrong table, and a table is much more persuasive than it
deserves to be.

### Corollary — never a loose pattern on a field that matters

The same investigation reported **"gender: present"** on a page with no gender
field, because `/gender|woman|man|non-binary/i` matched **"Ro*man*tic &
feminine"**. A substring test on a person's identity field, passing on a word
with nothing to do with it.

**Word boundaries, and exact labels, whenever the thing being matched matters.**
A false positive here does not merely mislead — it would have closed an
investigation into a real defect.

---

## A fixed bug that returns is a fix in the wrong place

`page.route('**/api/**')` also matches Vite's own `/src/api/base44Client.js`.
The harness serves the app's JavaScript as JSON, React never mounts, and every
page is blank — while a sweep happily reports measurements taken on nothing.

This was found, diagnosed and fixed once, in `scripts/lib/renderHarness.mjs`,
by replacing the glob with a URL predicate requiring
`pathname.startsWith('/api/')`. **It came back on 2026-08-25** in a new
one-off render script, because the fix lived in one file rather than in
something new scripts inherit.

**The rule:**

- Any render or probe script that intercepts routes **must use the harness**.
  Do not roll your own routing.
- The harness's **URL predicate is the only sanctioned implementation**.
- A guard must fail when anything under `scripts/` or `tests/` calls
  `page.route` with a glob containing `api`.

The general form, which is the part worth carrying: **when a bug can recur in
new code, fixing the instance is not fixing the bug.** Ask where the fix has to
live for the next author to inherit it — a shared helper, or a guard that
fails. A fix that only cleans up the one site you were looking at is a fix in
the wrong place.

---

## A push is verified against the remote, never trusted from local exit status

`git push` on a branch with no upstream fails with "no upstream branch" and a
non-zero status. Chaining `&& echo "pushed"` on the next line — a separate
command — prints success anyway, and a subsequent `pr:green` then reports on
the *previous* commit. This has now bitten twice: once on the hairline PR and
once on window-truth, where the merge line was explicitly conditional on an
amendment being in the merged commit.

**Confirm the commit is on the remote before merging: `git log --oneline -1
origin/<branch>`, or read the changed line back with `git show
origin/<branch>:<path>`.** Local exit status is not evidence that a push
landed. (`push.autoSetupRemote true` is now set repo-locally, which removes
the common cause but not the class.)

---

## Presence before properties

A render pass first proves the expected content strings are **present**, and
only then asserts anything about them. A property asserted over absent content
is not evidence — it is an empty read wearing a pass.

This was adopted after item 6's production verification reported "no shouting"
on five pages. Every entity call was stubbed to `[]`, so those pages rendered
their sidebar and nothing else: 738 characters on TodoList, all of it
navigation. The bodies under test never appeared. The pass was structurally
incapable of finding a defect and reported clean.

It surfaced by asking the page for three strings the code says must be there —
`Ideas`, `In progress`, `Done` — and getting NOT FOUND.

**The check is: could this assertion have failed?** If the content it asserts
about is absent, the answer is no, and the result means nothing. Encoded as
`presenceThenProperties()` in `scripts/lib/renderHarness.mjs`, which refuses to
run the property assertion at all when the presence check fails, and reports
MISSING instead of passing.

Two corollaries learned the same day:

- **Wait for content, not for milliseconds.** A flat sleep is either too short
  (everything reads as MISSING on pages that render fine — this pass first
  reported 34/34 absent) or too long (past the window the test is meant to
  observe, so the property passes vacuously). Poll for the expected string.
- **An empty read and a clean read look identical in a summary line.** Report
  what rendered, not only what was not found.

This is the render-side twin of the two instrument rules already here: a
positive control validates the instrument, not the conclusion's coverage; and
when a control refuses to fire, the check is the suspect.

---

## A guard must observe through the same channel as the traffic it guards

`assertHarnessServesModules` was written to catch one specific bug: a route glob
that answered the application's own JavaScript modules with JSON, blanking every
page. It used Playwright's `ctx.request`, which is a **separate network stack
that bypasses `ctx.route()` entirely**. So the guard watched a channel the bug
could never travel on. A control broke the routes deliberately and the guard
reported healthy.

**A guard that observes a different channel from the traffic it guards is not a
weak guard. It is not a guard.** It produces confident green over the exact
failure it was built for.

Ask of any guard: *is what I am measuring the same path the defect would take?*
Same family as the sweep that could not see background-drawn dividers, and the
production check that read a bundle for an `rgba()` string the compiler had
already turned into a hex.

**Corollary — a control whose healthy side returns null or empty is broken, not
passing.** After routing the probe through a page, its healthy branch returned
`contentType: null`, because a `fetch` from `about:blank` has no origin and is
blocked. Null read as "not JavaScript", which is indistinguishable from the
failure being tested. Navigate first, then probe. A control must be able to
tell *healthy* from *unreachable*, or it is only testing that something went
wrong somewhere.

---

## Emoji: the canon is about presentation, not the Unicode block

A violation is any glyph that renders in the **system emoji font** — colour,
platform-drawn, outside our type control. **U+FE0F, the emoji variation
selector, is the tell**: `☀️` is a violation, a bare `☀` is not. A sweep must
report the variation selector, not match a block range.

Monochrome text-presentation marks that inherit our typeface and `currentColor`
are not violations: ✓ ✗ ▲ ▼ ▶ ★ ☆ △ ◆ ○ ↔ ↗ ♥ ❝ ✆ ✎. `✦` was never an
exception to the canon — it is an instance of it.

---

## A canon rule is presumed UNENFORCED until it has been swept product-wide

The "no emoji" rule had never been aimed at the application. The only emoji
check ever written ran against two files — `claude/homepage-copy.md` and
`prerendered/index.html` — and its pattern was adequate: it would have caught
`🗳️`. It was simply never pointed at `src/` or `api/`. On that basis "zero
emojis" was reported, and it was true of the homepage while the product carried
**67** rendered pictographic emoji, including on guest-facing pages and in
message templates sent in the couple's name.

**Checking one file and reporting the general case is the same failure as a
guard watching the wrong channel.** In both, something real was measured and
the result was generalised past what it covered.

So: a documented rule is evidence of intent, never evidence of compliance.
Before treating any canon rule as held, ask *has this been swept across every
user-facing surface, or only where I happened to look?* If only the latter, the
rule's status is unknown — not clean.

### Corollary — and it does not create scope that was never claimed

A documented rule is evidence of intent, never compliance. **It is also not
evidence of reach.** Both failure directions have now happened, days apart:

- **Under-aimed (emoji).** A real product canon that had never been swept past
  two marketing files. Reported clean; 67 rendered emoji were live, including on
  guest pages and in templates sent in the couple's name.
- **Over-scoped (em dashes).** An authoring preference from one document
  (`claude/homepage-copy.md:3`) carried in the ledger as a product-wide lane
  rule. A sweep found 618 product sites. None were violations. The tell was that
  the owner-ratified, production-verified canon sentence at `Layout.jsx:572`
  contains an em dash — **a rule the canon sentence violates is not a rule.**

Before sweeping for a rule, establish two things: *where is it written*, and
*what did it claim to govern*. Then aim at exactly that. Mechanical rules
(emoji presentation, uppercase) are sweepable; stylistic ones (prefer sentence
structure over em-dash parentheticals) are authoring-time preferences and must
not be enforced by grep.

---

## When you build on a shared helper, read what it writes

A comment describing a past migration is a statement about **data that once
was**. It is never a statement about **current behaviour**.

`tokenPatch()` wrote three columns: hash, ciphertext, and the token itself in
plaintext. The plaintext line carried the comment `// legacy plaintext — E3
nulls this`. That was read as "plaintext is no longer written". It never said
that: `scripts/null-rsvp-plaintext.mjs` was a one-time migration that nulled
existing rows and did not touch the writer. E3 cleaned the data and left the pen
on the desk.

#538 then moved minting to the server write boundary by calling that helper —
without reading its three-column write — so every guest created afterwards got a
fresh plaintext bearer capability sitting beside its own ciphertext, which
defeats the encryption key for that row entirely.

#539 compounded it: it put the ciphertext on a strip list and **deliberately
left the plaintext**, arguing "removing a null gains nothing". The column was
not null. Shipped, it would have sent live tokens to the browser while removing
the merely-encrypted form — strictly worse than the leak it was opened to close.

Neither was caught by reasoning. It took production data: a row minted hours
earlier held a 20+ character value in a column asserted to be empty.

**Before building on a shared helper, read its body — not its docstring, and
not the summary in your head.** And when a data observation contradicts a code
reading, the data wins: the code reading is a claim about now, the data is a
record of what actually happened.
## Hook the server write boundary, not the UI call sites

When a rule must hold for **every row** of an entity, enforce it where the write
happens on the server — not at the screens that trigger it. Call sites are a
list that grows behind you.

RSVP token minting was scoped as four UI triggers. There were **five** creation
paths, and the two the UI list missed were the dangerous ones:

- `Onboarding.jsx` calls `Guest.bulkCreate` straight through the SDK, bypassing
  `api/my-guests.js` entirely — and those are **the first guests a couple ever
  has**. Invisible from any list of "screens where you add a guest", because it
  is not that screen.
- `api/guest-contact-review.js` creates a Guest server-side on approval, with no
  client involvement at all.

Minting moved into `api/my-guests.js`'s create payload, which covers the add
flow, CSV import and Ava's `create_guest` tool at one point that a call site
added next month cannot miss — and costs no extra write, because the fields ride
in the create body rather than a follow-up PUT. The two genuine bypasses got
their own hooks.

**The question to ask: if someone adds a sixth way to create this row next
month, does my enforcement still hold?** If the answer depends on them
remembering, it is at the wrong layer.

---

## Every user-initiated action must render success or failure

Silence is a defect, not a neutral outcome.

"Copy links" on the guest list did nothing: no copy, no toast, no error. The
handler fetched the links, awaited the response, then called
`navigator.clipboard.writeText` with no try/catch. The request succeeded, the
write was denied, the rejection went unhandled, and the user saw a dead button
on the control that is how a couple gets RSVP links at all.

Two different causes produce that identical symptom, and both were present:

- **An unhandled rejection.** Any `await` that can throw, in a handler with no
  catch, ends as silence.
- **A guard that returns without speaking.** `if (isPro) return;` is the same
  dead button. It is also a conversion loss: a user who taps a paid feature and
  gets nothing learns the product is broken, not that the feature is paid.

**Neither shows up in a build, a probe, or a render sheet.** The instrument that
finds them is a person clicking, which is why the owner found this one and
nothing in the pipeline did.

So: every handler that can fail must show what happened, and every gate must say
what it needs. Where the mechanism can be refused by the browser (clipboard,
notifications, storage), there must also be a path that works without it — the
fallback is the safety net for the primary path, not an error state.

**Corollary — verify in the engine where the bug lives.** This one was
Safari-only: Safari requires the clipboard write inside the click's transient
activation, and an `await` on a network call spends it. Chromium is permissive
and writes anyway, so a green Chromium run was a control that could not fail.
Playwright ships webkit; use it when the defect is engine-specific.

### Corollary — a check that searches wider than the thing it verifies

An assertion scoped wider than its subject can be satisfied by something else
entirely, and then it passes on a broken tree.

The clipboard fallback check searched the whole of `Guests.jsx` for
`setCopyFallback(`. A control deleted it from the Copy-links handler — and the
check still passed, because the collect-link handler in the same file also uses
it. Rescoped to the handler body, the control fires.

Third instance of one family:

- **`ctx.request` vs `ctx.route`** — the guard watched a channel the bug could
  not travel on.
- **`stripTokenColumns(` counted** — `.map(stripTokenColumns)` passes the
  function bare, so a count of call-parens structurally missed the list path,
  the most important of the three.
- **File-wide `setCopyFallback`** — another usage satisfied the assertion.

**Scope the assertion to the unit under test.** If the check would still pass
when the subject is deleted, it is not checking the subject. The way to find out
is the control: plant the defect in exactly the place the check names, and watch.

### Corollary — verify a deploy by asserting behaviour at a known URL

Not by hunting a marker in a chunk you guessed the name of.

Ten minutes went into polling `Guests-BzQ-XmHR.js` for `ClipboardItem`. That
chunk is a **78-byte re-export stub**, and the symbol lives in a different
module entirely — the string was never going to be there, and the loop would
have run forever reporting a truthful zero about the wrong file.

Same family as the guard on the wrong channel: the check was fine, the target
was wrong.

**Prefer an assertion the change actually alters at a stable address**: an
endpoint's response, a rendered string on a known route, a CSS rule in
`index-*.css` (linked from `/`, so its name is discoverable rather than
guessed). Where only a lazy chunk carries the change, read its name **out of the
bundle that references it** instead of predicting it — and if the marker is
absent, first ask whether it could ever have been present.

---

## Owner-accepted content needs a landing check

Acceptance is not a merge.

The 19 `rsvpIntro` rewrites and the 19 in-voice `rsvpSent` tails went through
three rounds of critique — construction families, mechanism phrasing, US-English
sweep, loanword ruling — and were owner-accepted. **They were never written to
the file.** `git log -S rsvpIntro -- src/lib/websiteThemes.js` returns nothing:
that field has never been touched by any commit. The owner found it on his phone,
reading the original lost-property copy in production, weeks of review later.

The cause was mundane. A later message accepted a *different* copy set in the
same thread, that one was applied, and the earlier set was treated as done
because it had been agreed.

**Any copy set the owner signs off is verified PRESENT in the codebase before
the ticket carrying it is closed — and the check is a grep for the actual
strings, not a claim that it was applied.**

Generalises past copy: an accepted decision that produces an artifact (a string,
a config value, a schema field, a route) needs the artifact confirmed to exist.
The same family as the empty read — "I did it" is not evidence, the file is.
