# Standing rules — Openinvite build terminal

These survive restarts. Re-read at the start of every session.

---

## A hazard left in the workspace will eventually be picked up by a routine command

**Two instances in one day, both fixed by removing the hazard rather than by
resolving to be careful around it.**

1. **An unowned stash entry.** It sat on the stack since July with no branch and
   no owner. Two ordinary `git stash pop` calls reached for it, both times
   conflicting in frozen payments files. Fixed by converting it to a named
   branch and emptying the stack — a pop now fails loudly.
2. **Credential files in the working tree.** `scripts/capture/output/` holds a
   browser `storage-state.json` and a live `rsvp-token.txt`. A routine
   `git add -A` staged both.

3. **The stash manoeuvre, reached for a third time.** To write a docs-only
   commit to main while standing on a branch: stash, switch, commit, switch
   back, pop. Five steps, twice already destructive.

Discipline is not the fix for any of them. The hazard is.

### The third instance names the general shape

> **The manoeuvre existed because the workspace made the simple thing hard.**

Nobody stashes for pleasure. The stash was reached for because writing a doc to
main *while working on a branch* had no other route. Resolving to stop stashing
would have left that route missing, and the reach would have happened again —
it already had, twice, after the rule was written down.

**The fix, one command, permanent:**

```
git worktree add --detach ../openinvite-docs origin/main
ln -s ../openinvite/node_modules ../openinvite-docs/node_modules
```

Every docs-only commit is written in `../openinvite-docs` and pushed with
`git push origin HEAD:main`. No stash, no switch, no pop, and the branch you are
working on never moves.

Two details that make it work rather than merely exist:

- **Detached on purpose.** A worktree that checked out `main` as a branch would
  claim it, and the primary repo could no longer check out main at all —
  `new-feature.sh` does exactly that. Detached at `origin/main` claims nothing.
  (`check-canon-branch.mjs` already exits 0 on a detached HEAD, so canon may be
  written there, which is the entire point.)
- **`node_modules` symlinked**, because the pre-push hook ends in `npm run lint`
  and a fresh worktree has none. Without the symlink every docs push fails on a
  missing eslint.

When a hazard keeps getting picked up, ask what the workspace was making hard.
The answer is usually the fix.

### And the mechanism behind the second is worth its own line

> **Protection that lives in version control is only as old as the commit you
> are standing on. Check out an old commit and you check out its old safety.**

Both files WERE in `.gitignore`, and had been for two days. The rule covering
them was added on **2026-08-25**. The recovery branch was created at a
**2026-07-16** base, which checked out a `.gitignore` that predated it — so
every ignored hazard in the working directory silently became stageable again.

**Four rules were added in that same commit** (`scripts/capture/output/`,
`.claude/settings.local.json`, `base44/.app.jsonc`, `.env*.local`). Any branch
based before 25 August loses all four at once.

**This is not a fact about ignore files.** It is true of every guard that ships
in the tree: lint configs, CI workflow definitions, hook scripts, the guard
scripts themselves, and this document. A July checkout has July's safety, and
nothing announces the downgrade. Whenever you check out an old base, ask what
protection you just rolled back with it.

Protection that does NOT time-travel:

| Layer | Survives an old checkout | Survives a fresh clone |
|---|---|---|
| `.gitignore`, guard scripts, canon | no — versioned with the tree | yes |
| `.git/info/exclude` | yes — unversioned, per-clone | **no** |
| `core.hooksPath` + `.githooks/` | yes — local config | **no** |
| CI | yes | yes |

Only CI survives both, which is why `--no-verify`-skippable checks must also
run there. The local layers are **machine-local**: a fresh clone starts with an
empty `info/exclude` and no `core.hooksPath`, so a new machine begins with the
CI backstop alone. That is the same rule wearing a different hat.

**On the incident itself: `info/exclude` did not fail — it did not yet exist.**
It was written 2026-08-27 23:05:26, nine minutes after the 22:55:49 commit, in
the same second as `check-no-credentials.mjs`. It was remediation, not a net
that failed. Verified after the fact by simulating the July base in a scratch
clone — with the `.gitignore` rule stripped, `info/exclude:25` still caught both
files and `git add -A` staged nothing.

---

## A rule you only grep for is a rule you only partly enforce

The retired accommodation page rendered **🏨 and ⭐ on a live guest surface**,
against a standing rule, for as long as it existed. Every emoji sweep this
project has run searched the SOURCE. This was found by RENDERING the page.

**Ask of every content rule: does anything check the rendered surface, or only
the source?** If only the source, that whole family — emoji, sentence case,
uppercase, US English, exclamation marks — is weaker than it looks. A rule can
be violated by something the source never spells out: a value from data, a
library's own markup, a glyph inside a component nobody thought to sweep.

Third time in one day that discarding an instrument and looking directly found
something the instrument was **structurally incapable** of seeing.

---

## An override that leaves no trace cannot be audited

**Owner ruling, 2026-08-30.**

The entire justification for an escape hatch is that it is used **rarely and
deliberately**. Rarity is a claim about a count — and you cannot count what does
not announce itself.

> **A silent override is indistinguishable from a guard that simply passed.**
> Same defect as a silent guard, arriving from the other direction.

Found when the `Canon-On-Branch:` trailer was exercised in real CI for the first
time and the step printed **nothing at all**. The override worked; it just left
no evidence that it had been used, on the guard protecting the one thing in this
repo that has actually been destroyed twice.

### The sweep, done rather than promised

The shape has exactly one sibling, and it was checked: **two guards in the repo
have overrides, four paths between them.**

| Guard | CI trailer path | Local passphrase path |
|---|---|---|
| `check-payments-freeze` | **already announced** — names the trailer and every touched file | **already announced** |
| `check-canon-branch` | was silent — fixed | was silent — fixed |
| `check-no-credentials` | **no override exists**, by design | — |

The payments guard was already correct on both doors and needed nothing. Saying
so explicitly is part of the result: *"I checked and it was fine"* is a finding;
not mentioning it is not.

---

## When a pathway only exists in CI, go to CI

**Owner ruling, 2026-08-30 — the default move, not a clever one-off.**

The `Canon-On-Branch:` override could not be exercised locally: it only runs
under `--ci`, and the bug being fixed was that CI never reached it. Simulating
the environment proves the FUNCTION works; it does not prove the PATHWAY is
reachable — and an unreachable pathway with a passing unit test is exactly what
had been sitting there since the guard was written.

**So: push a disposable branch, open a PR purely to make Actions run, watch the
real thing, close it unmerged.** CI here triggers on `pull_request` and pushes
to main, so a branch push alone runs nothing — the throwaway PR is the trigger.

Cheap: one branch, one closed PR, three minutes. The alternative is a tested
function inside a pathway nobody has ever entered.

Pair it with the control. The override run passed *because* a canon file was on
the branch with the trailer; the same commit with the trailer removed exits 1.
Without that control, "it passed" would not have distinguished the override
working from the guard not looking.

---

## A report is an interface, and it can report a state the system does not have

**2026-08-30.** A report closed with "no open PRs"; a PR was opened later in the
same turn and the line was never restated. True when written, false when read.

This is `THE INTERFACE REPORTS A STATE THE SYSTEM DOES NOT HAVE` — the rule
already in this file — pointed at our own output rather than at the product.
Today it also caught two docstrings and four silent guards, all the same shape.

**So: state at the END of the report, from a fresh query, not from memory of
what was true earlier in the turn.** `gh pr list --state open` costs nothing.
The failure is not carelessness; it is that a status line written mid-work
describes the moment it was written, and a reader reasonably reads it as
describing now.

---

## A test that cannot fail looks exactly like a test that passed

**2026-08-30.** Verifying that the guard-coverage change had not weakened any
verdict, the verify-red probe modified a frozen payments file and a canon file
in the WORKING TREE — and both guards passed. They diff COMMITS, so the probe
was invisible to them. A silent exit 0 would have read as proof that the guards
still refuse, and the visibility change would have shipped with its own
verification broken.

What caught it was the line added minutes earlier: `0 file(s) checked`.

> **Before trusting a red test that came back green, ask what it would have
> taken for it to fail — and confirm the instrument could see the thing you
> planted.**

Re-run on a committed probe, both guards refused with exit 1. Same probe, same
guards, opposite result, purely because the input was reachable.

This is the argument for visibility-before-strictness made twice in one day by
the same four print statements: once finding that the canon guard never ran in
CI, once finding that this verification was hollow.

### The corollary, from the same hour

> **A visibility fix that prints nothing is worse than none, because it
> manufactures confidence.**

One of those coverage lines was written with single quotes, so it printed
`${resolvedRange}` literally. A reader would have seen a line, assumed coverage,
and learned nothing. **Read the rendered line, never the source of it** — the
same rule as reading a page rather than its markup, applied to a log.

---

## The header is part of the interface

**Second instance today, so it is a shape, not an incident.**

`check-canon-branch.mjs` carried this in its docstring:

> "An edit made through the GitHub UI on a branch — a pre-push hook is local,
>  which is why this also runs in CI."

**It had never run in CI.** `actions/checkout` produces a detached HEAD, the
guard asked the checkout for its branch name, got `HEAD`, and exited before
reading a file. The sentence was false from the day it was written, and it named
the exact scenario it did not handle — so a reader checking "is this case
covered?" got a confident yes.

This morning's instance: the payments guard whose header claimed it had no hole.

> **A docstring that describes behavior the code does not have is a false state
> report, in the same family as an instrument that returns a confident empty
> result.** It is worse in one way: nothing will ever contradict it, because
> comments are not executed.

So: **when you fix the behavior, say in the PR that the comment was false**, not
merely that the code changed. The next reader needs to know the comment was
CHECKED rather than inherited — otherwise the correction is indistinguishable
from a comment that was always true.

And when reading a guard to learn what it covers, believe the code path, not the
header. Today the header was wrong twice.

---

## A GUARD THAT CANNOT FIND ITS INPUT MUST FAIL, NOT PASS

**Owner ruling, 2026-08-30. Headline rule.**

> **Absence of a finding is only evidence when you can prove something looked.**

`scripts/test-us-english-spelling.mjs` scans only ADDED lines inside a resolved
diff range, and its own header says it "Exits 0 if … no diff base is available".
So a green check can mean either "I looked and it was clean" or "I did not look",
and the system reports the first while holding the second. Three uses of
`colour` reached main through it in #611.

**This is the merge gate's SKIPPED-is-not-PASS bug, in a different instrument.**
Identical shape, already diagnosed, already fixed once.

### And the failure worth recording is not the bug, it is what we did after it

> **WE FIXED A SHAPE IN ONE PLACE AND DID NOT SWEEP FOR IT.**

When the merge gate was found accepting SKIPPED as PASS, it was fixed there and
nobody asked which OTHER instrument had the same shape. That question was free
at the time and would have found this one.

**So: when a defect turns out to be a SHAPE rather than an incident, the fix is
not done until you have swept for the shape elsewhere.** Name the shape, list
every place it could live, and check them. A shape fixed in one instance is a
shape you now know to look for — and looking is cheapest immediately after you
have just understood it.

Today's four instances of the family, in one place, because the count is the
argument: `?api_key=` returning `200 []`; `timeout`-not-found reported as a
passing check; `git push | sed` testing sed's exit status; and this. Each
returned a confident, clean, empty answer.

---

## A reference pattern has a core and a periphery

**Owner ruling, 2026-08-30**, settling how a named reference implementation
travels to a surface that only partly fits it.

The accordion pattern's **core** is its structure: collapsed by default, one
section open at a time, the heading hierarchy, the rhythm. Its **periphery** is
everything that presupposes a choice: pills, the summary chip, "Nothing selected
yet".

A guest-facing FAQ has questions and answers and nothing to select. It takes the
core and leaves the periphery — and:

> **An adoption that takes the core and leaves the periphery is a CORRECT
> adoption, not a compromised one.**

The failure this prevents runs both ways. Forcing the periphery onto a surface
with nothing to select invents a decision the user never makes; refusing the
adoption entirely because the fit is partial abandons the structure that would
have helped. Neither is the answer — say which half applies and why.

So when a pattern is propagated, state for each target which half it takes. A
partial instance recorded as partial is a finding. A partial instance quietly
presented as a full one is drift waiting to be "fixed" back.

---

## A deliberate hang needs an expiry

**Established 2026-08-30**, from the chunk-reload fix.

Suppressing an error by returning a promise that never settles is a legitimate
move — while a navigation really is coming, holding the loading state is exactly
right. But unbounded, it trades an error screen for **a spinner that never
ends**, which is worse, because a spinner looks like progress. A user will wait
on it, and nothing will ever arrive.

> **Any deliberate hang gets an expiry and a real failure at the end of it.**

The chunk fix holds Suspense for 10 seconds and then rejects with the original
error, so the ordinary fallback appears after all. Long enough that a committing
navigation always wins the race; short enough that nobody is stranded.

And prove the expiry fires by waiting the whole interval out in a test. An
expiry nobody has watched elapse is an assumption, not a guard.

---

## Never hold a fix to protect a measurement the fix does not affect

**Owner ruling, 2026-08-30.** Asked whether to delay the chunk-load fix so the
newly-shipped beacon could gather a baseline first, the answer was no, and the
reasoning generalizes:

> **THE FIX AND THE MEASUREMENT ARE INDEPENDENT.** The beacon measures whether
> the RELOAD succeeds. The never-resolving promise changes only what is
> DISPLAYED while the reload is attempted. Shipping it does not blind the
> instrument — the outcome field records the same thing either way.

So the alternative was leaving a known-bad experience live purely to preserve a
measurement the fix would not disturb. **That trade is never worth making.**

The test is not "am I measuring something?" but **"does this fix change what the
instrument reads?"** Ask it explicitly:

- **No** — ship the fix now. The data accumulates regardless, and it accumulates
  faster with fewer people staring at an error screen.
- **Yes** — then the question is a real one, and it becomes *how long a baseline*,
  discussed and agreed, not assumed in either direction.

The failure this prevents is a cautious-sounding one: holding a shipped-ready
fix out of a vague sense that changing anything spoils the reading. Caution that
costs users something real, and buys nothing, is not caution.

---

## Verify before you drop: read it back from where it will actually live

Converting two unowned stash entries into branches, the first commit used
`git add -A` and swept in untracked capture output that was never in the stash —
including `scripts/capture/output/storage-state.json` and `rsvp-token.txt`,
**session credentials**.

It was caught by diffing the commit against the stash **before** the stash was
dropped. Then: staged by name from `git stash show -u --name-only`, verified
file-by-file and insertion-by-insertion, content-diffed against the rescued
copies, pushed, **re-read from `origin`**, and only then dropped.

Read-verify-write-reread, applied to git. The reread is the half people skip,
and it is the half that makes dropping safe.

---

## A component's name is not its purpose, and shared code has more than one owner

**Delete by feature, never by filename.** Three times in one wave a shared
component's NAME misled the deletion scope:

1. **`photoExport.js`** looked like it belonged to Photos. It belongs to the
   **moodboard** — deleting it broke the build, caught by the re-grep.
2. **`CATEGORIES`** looked like it belonged to guide categories. It is
   **load-bearing for Places**, which stores its places inside them.
3. **The eight asset previews** looked like they belonged to the asset feature.
   Their second job is **showing what a universe looks like** — in the universe
   studio and in ONBOARDING, the first thing a couple ever does.

This is the specific reason the Wave 2 scope report was wrong seven times, and
every time in the direction of OVER-deleting.

---

## Ask of every deletion: what does the surviving surface now claim?

Removing the asset feature left eight previews inside the universe world view,
under **"Nº 05 — Your wedding in this world"**, the couple's real names, and ten
labels reading *Save the date · Menu · Place cards · Welcome sign…* — a labelled
inventory of pieces, shown at signup, for a feature that no longer exists. The
code comment said it outright: *"every asset type the product has."*

**A deletion can CREATE the interface-reports-a-state-the-system-does-not-have
defect**, on a surface it never touched, by leaving a promise behind.

> If a couple can no longer make these things, what does this screen claim?

Ask it of every removal, first — not tenth. And a reframing must be honest
BEYOND the current change: "how this world would look across a wedding day"
stays true after the printed suite retires. **A reframing that only survives
until the next deletion is a delay, not a fix.**

---

## When you find yourself performing a manoeuvre, ask what problem it solves

To write one document to main: **stash, switch, commit, switch back, pop.** Five
stateful steps. Docs go to main directly and always have — the canon guard's own
error message says so.

The pop then took `stash@{0}`, which was **a stranger's `feat/multi-currency-pricing`
WIP**, because the stash pushed a moment earlier was EMPTY. It conflicted in two
frozen payments files. Second incident from the same unowned stash entry.

**The mistake was not the command. It was the manoeuvre.** Most of today's damage
came from elaborate sequences standing in for simple ones — walking backwards to
find a boundary instead of naming a range, reimplementing a guard's logic in a
shell one-liner instead of running the guard.

Second instance of the local-question rule: *the simplest thing that answers the
question is usually also the safest.*

`git stash pop` takes the top of a stack you did not necessarily push to. Prefer
`git stash push` and pop **by name** — or don't stash at all.

---

## THE INTERFACE REPORTS A STATE THE SYSTEM DOES NOT HAVE

**This is the defect. Everything else in this document is a corollary.**

> **EVERY DISPLAYED STATE MUST BE DERIVED FROM THE THING IT CLAIMS TO DESCRIBE**
> — not stored beside it, not written once and trusted, not computed twice by
> two files that agree today.

Ten instances, found in one week, in ten unrelated features. They were treated
as ten bugs. They are one defect wearing different clothes:

1. **A placeholder that publishes** — shown as a hint, saved as real content.
2. **Names that render stale** — `coupleNames` written once at signup, never
   re-derived, read by 40+ surfaces.
3. **An address shown that was never on the record** — `StudioWebsite.jsx`
   appended `Math.random()` to a name stem and wrote it to LOCAL STATE ONLY.
4. **A save that reported success while excluding the edited field** — the
   studio said "✓ Saved" over an address it had removed from its own payload.
5. **A category switched on that guests never see** — studio read
   `enabled !== false`, guest read `enabled &&`; undefined meant opposite things.
6. **Publish gated a link but not a page** — an unpublished guide was fully
   readable by anyone with the URL.
7. **"Your website is live" while the address resolved to nothing** — the status
   line was true about the flag and false about the world.
8. **Live streaming promised with no page to show it** — the dashboard said
   "visible to guests"; no guest route existed.
9. **A moodboard button whose feature was gone** — a control outliving what it
   controlled.
10. **A font pairing that changes nothing** — `activeTypography` displayed a
    pairing name while `resolveTypography` gave the universe unconditional
    priority. The codebase already called it "permanently dead code", and the
    panel went on displaying it.

**Publish parity is a special case of this.** So is the invented-content family.
So is the silent-failure family. So is every "two sources of truth" bug.

Each corollary is this rule seen from one angle:

- *one owner for a value* — so there is nothing beside it to drift
- *derive, don't store* — so it cannot be written once and go stale
- *one computation, two uses* — so two files cannot quietly disagree
- *the meaning of absence decided once* — so undefined cannot mean two things
- *a guard on the same channel as the thing it guards* — so the check sees what
  the user sees
- *publish gates the page, not the link* — so the promise and the world match

**The test for any interface element:** if the thing it describes changed right
now, and nothing else ran, would this still be true? If not, it is not derived —
it is a copy, and copies are how the interface starts lying.

---

## When a control replaces a readout, it must carry the readout

The left panel's Design section is replaced by one pill. The section carried two
rows; one was a dead readout, and the other displayed **the current universe**.

The pill reads **"London — Change universe"**, not "Change universe" — the
universe name is the only true information that section ever carried, and it
survives the control that carried it.

Same check as removing a door and confirming the destination is still
reachable — applied to **information** rather than navigation. Ask both:

- if this control goes, can the destination still be reached?
- if this control goes, is the information it displayed still shown anywhere?

---

## The meaning of absence must be decided once and written down

**Undefined is where two correct implementations quietly disagree**, and it
never shows up in either file's own tests.

Three instances today, in three unrelated features:

1. **`??` versus `||`** on the music message — one treats empty string as a
   value, the other as absent.
2. **The `coupleNames` fallback ordering** — nine sites consulted the stale copy
   first and the truth only when the copy was missing.
3. **`enabled` on guide categories** — and this one is the worst:

```
studio  ExperienceGuideTab.jsx:234   enabled !== false   → undefined reads as ENABLED
guest   WeddingExperiencePage.jsx:39 enabled && …        → undefined reads as OFF
```

Both are reasonable. Both are defensible in isolation. **Together they make a
product that lies:** the couple saw the switch on, the guest saw nothing, and
neither file was wrong on its own terms.

**This is publish parity in its purest form** — not a promise the site failed to
keep, but a CONTROL REPORTING A STATE THE SITE NEVER HAD, for every category
ever saved without an explicit toggle, since the feature shipped.

> When two surfaces read the same field, decide once what absence means, write
> it beside the field, and make both sides read it the same way.

---

## When an instrument has already been wrong once, discard it rather than debug it — if a simpler direct observation exists

A selector written to measure card geometry reported a **199×273 sidebar item**
as a card at 1440, and found **nothing at all** at 390. It had disqualified
itself. Reading the two screenshots directly was faster and more trustworthy
than repairing it.

**This is the move AFTER suspicion.** Suspecting the instrument is step one;
the answer is not always "fix the tool". Ask first whether a direct observation
is available — a render, a file read, a real download — and prefer it.

Repairing a wrong instrument also carries a quieter risk: the repaired version
is trusted more than it has earned, because effort was spent on it.

---

## The linter is not a completeness check

ESLint flags unused **imports**. It does not flag unused **locals**.

Removing the hub's Preview card left `siteUrl` and a `rightLabel` render behind
as dead code; the linter caught the unused `Eye` import and said nothing about
the other two. They were found by grepping after the deletion.

**The tools that run automatically cover a smaller area than they feel like
they cover** — which is precisely why the delete-then-grep step exists. A green
lint is not an empty room.

**Three instances in one day** — `siteUrl`/`rightLabel` on the hub, the seating
copy-layout strings, and the guest guide's own `CATEGORIES` constant. It is now
a documented characteristic of the tool, not a surprise.

---

## An exemption must name something that exists

The guest-PII allowlist exempted two files that had just been deleted. An
entry pointing at a file that is gone **can neither be justified nor removed on
evidence**, so it survives forever as a hole with a name on it.

Same family as keying an exception to code rather than to a line number: an
exception is only as good as the thing it points at.

The guard asserted it had no STALE entries, which is why this was caught rather
than inherited.

---

## A guard whose expected count is edited without a reason is indistinguishable from a guard being silenced

The slug resolver asserts the number of adoption sites. Deleting one adopter
required lowering seven to six — **the same edit a person makes to quieten a
failing guard**.

The difference is prose. The reason goes in the guard, in the same PR as the
change that caused it.

---

## The value of an override is its rarity

The payments freeze refused a push over a COMMENT in `api/_lib/planGift.js`
naming a deleted endpoint. The override existed and was not used.

> **The first time an override is spent on something trivial, it becomes a
> thing we do, and the next person reaches for it without thinking.**

A comment naming a deleted endpoint is untidy. An override that gets used for
untidiness is dangerous. The stale reference rides along with the next
legitimate payments change instead.

---

## Delete, then grep the name again — and its synonyms

The marketing description still sold "live streaming" after the bullet beside it
had been removed. It was found by re-grepping AFTER the deletion, and that is a
different search, not luck:

- the **first pass** hunts a codebase that still contains the thing, where every
  mention looks like it belongs;
- the **second** searches an emptier space, where a survivor stands out.

Make it a step. Grep the name, the synonyms, and the marketing phrasing.

---

## Ask of every deletion: is this feature sold anywhere?

Marketing site, pricing page, comparison pages, help centre, launch copy,
directory listings. **A paid product advertising a feature it no longer has is
the worst version of publish parity — the promise is made before the money
changes hands.**

Removing a claim for a deleted feature **needs no owner accept**: it is a
correctness fix, and leaving it would be a lie. Adding or rewording anything on
a marketing page still does. Report every removal so the owner sees what left
the sales copy.

---

## A marketing copy change is not shipped until the prerendered output is regenerated

`test:marketing-routes` passed. The source was correct. **And the claim was
still being served**, because the marketing site is prerendered and
`prerendered/index.html` still contained the sentence.

Caught by the prerendered-freshness guard in CI — a guard the terminal did not
know existed and had not run locally. `npm run build:prerender`, and the
freshness guard reads the git diff, so it only passes once `prerendered/` is
committed alongside the source.

**Editing marketing source is half a change.**

---

## A decision recorded only in the code that implements it dies with that code

`Seating.jsx:401` carries "decision #3 — tables only, never guest assignments".
That comment is the only record of the ruling. Deleting the implementation would
delete the reasoning.

Before any deletion, read the comments for reasoning that exists nowhere else
and rescue it first, as its own commit.

---

## Never prune schema during a code deletion

An orphaned entity with **no rows costs nothing to keep and something to
remove**, and Base44 schema changes are the least reversible thing this project
does. Do not delete the local `.jsonc`, do not hand-edit the generated fields
file.

Collect the orphans across the whole wave and decide them in ONE deliberate pass
rather than seven nervous ones. See scratchpad/WAVE2-ORPHANED-SCHEMA.md.

---

## One computation, two uses — never two computations of one truth

The guest nav decided what to LINK to. The router decided what to SERVE. Two
answers to one question, and nothing held them together.

The fix derives reachability from **the same computation the nav uses**, rather
than writing a second rule that happens to agree today. That is what guarantees
a link can never lead to a refusal, and a refusal can never hide something the
nav still advertises.

**The single-owner rule applied to a COMPUTED value rather than a stored one** —
the same principle as `coupleNames`, and it belongs beside "a second copy of a
user's own words is a defect waiting for its turn."

---

## When a fix breaks a probe, the probe may be standing on the defect

`test:guest-essentials-reachable` read the nav from `/w/:slug/our-story`. Two of
its four hostile cases DISABLE our-story — so the probe only ever worked because
unavailable pages rendered anyway. The moment they stopped, it reported itself
blind.

**Order matters.** The regression was established by running the same probe on
`main` first (4/4 there, 2/4 on the branch) before anything was adjusted. That
is the difference between discovering this and quietly weakening a test.

> **A probe moved to a new vantage point must be re-proven able to fail from
> it.**

Moving a probe until it passes is exactly how a suite becomes decorative. The
control run — 0/4 with the guarantee stripped, "CONTROL PASSED" — is what
separates the two. Both halves belong together: either alone is dangerous.

**And a probe should stand on something we have promised never moves.** The new
vantage point is `/celebration`, covered by the always-on guarantee.

---

## Deduplicate on what the person perceives, not on what the code identifies

The guest nav showed four destinations twice. Three pairs shared a `key`. One
did not:

| | key | route | label |
|---|---|---|---|
| subLinks | `accommodation` | `/w/:slug/accommodation` | **Stay** |
| WEDDING_PAGES | `stay` | `WeddingStayPage` | **Stay** |

Different key, different route, **same word, same content underneath**. Keying
the dedupe on identity would have passed every test and still shown a guest two
doors to the same room.

> **The user does not have access to our keys. They have access to the words.**

---

## A guard should say why it still exists

The nav dedupe is a WORKAROUND for a structure not yet corrected — two link
lists that overlap. So the guard reports the overlap *alongside* the dedupe
assertion, and names the dedupe as load-bearing until the lists are made
disjoint.

Whoever finally separates them will find the guard explaining what it was
standing in for, instead of finding a check that looks redundant and removing
it.

**This is the road-moved rule applied FORWARD rather than in hindsight** — the
first time in this project that failure was prevented rather than discovered.
Do it whenever a fix is a workaround for something still uncorrected.

---

## Test the real assembly, not a reimplementation of it

**A test that models the code cannot catch the code diverging from the model.**

The nav guard reads the actual assembly expression out of the source rather
than rebuilding the link list and asserting on its own copy. The sharpest
phrasing yet of the same-channel rule: a check that runs beside the thing it
checks is not checking it.

---

## When consolidating duplicates, take the most careful implementation, not the most common one

Two files compared `start_time` with `localeCompare`; one parsed it to minutes.
**A majority vote would have shipped "9:00" sorting after "17:00" into the
shared helper and called it consistency.**

Deduplication is the moment a latent bug can become the standard. The only
defence is READING all the copies rather than counting them.

---

## An exception must be keyed to what it exempts, not to where it sits

A line-numbered allowance was invalidated by adding one import above it.

Same family as the **rename that slipped the payments freeze** (fixed with
`--no-renames`) and the **relative `git checkout <sha> -- FILE` that ate the
canon**. Anything anchored to a POSITION rather than to an IDENTITY comes loose
the moment the file breathes. Key on the code, the name, the content hash —
never the line, the index, or the offset.

---

## Verify red: find a guard's blindness by trying to make it fail

**The single most productive habit in this project.** It has caught more than
any amount of careful reading.

The clearest case: a guard written to catch inline schedule sorts used
`\.sort\([^)]*start_time` — which cannot cross the `(a, b)` parameter list, so
it never reached the token it was written for. It was **green against the exact
defect it existed to catch**, and would have shipped as coverage. Fixing it
surfaced two more sort sites neither the advisor nor the terminal knew existed.

A guard that has only ever been seen green has not been tested. Break the thing
it guards, watch it go red, put it back.

---

## Where a rule is right and where it is absent may split along who sees it

The correct day-then-time schedule ordering already existed on
WeddingCelebrationPage — the GUEST-facing page. It was absent from both
dashboard lists, the surfaces a COUPLE works in.

**The rule was right where a guest sees it and absent where a couple works.**

This is a SEARCH DIRECTION, not only a rule: anything got right for guests
during the RSVP programme may still be wrong on the dashboard side, and the
reverse. When a defect is found on one side of that line, look for its twin on
the other.

---

## Edit by an exact range, never by searching for a boundary

Removing a function by walking backwards to "the comment above it" swallowed
thirty unrelated lines, including `passwordGate` and everything that used it.
Locate the exact first and last line and delete precisely that.

**Lint caught it this time. Lint will not always be looking at the file you
damaged** — it reports what is broken, not what silently vanished.

The recurrences: a non-greedy regex swallowing content between the first match
and the target; a regex that read only a literal array and missed
`...Object.keys(DEFAULT)`, reporting "slug included: False" about the most
serious defect in that branch.

---

## When you remove or reroute something, ask what else was standing on it

Two costumes, one principle.

> **A layer can die by having its road moved rather than by being deleted.**

Nobody deleted the publish backstop. The three-layer address design had one, and
when the claim path was repointed at derivation the backstop simply stopped
being on any road anyone travelled. **Every test still passed, because a layer
that is never reached never fails.** It was found only by asking directly
whether publish still resolved a contested address — the answer was no, and the
harmful case was exactly a couple who publishes, sends invitations and never
returns.

> **A fix that narrows a payload can orphan the field it removed.**

Removing `slug` from the studio autosave was correct and left an input still
writing into that payload's local state — so the field looked saved and never
was.

Same question closes both: **what else was standing on the thing you moved?**

---

## A symmetric resolution is not a resolution

Two records race for the same address. Each reads the other holding "their"
address. Each politely yields and moves. Then each reads the other again.

**That is not a race condition, it is a livelock built out of good manners.**

Any mutual-yield mechanism needs an **asymmetry both sides compute identically**
with no coordination. Here: earliest `created_date` wins, id breaks the tie —
so both sides reach the same verdict about which of them moves, and exactly one
does. If both yield the address belongs to nobody; if neither yields nothing is
fixed.

Politeness is not a protocol.

---

## Nothing reported is not the same as nothing wrong

**Every instrument must distinguish "I looked and found nothing" from "I did
not look."** An empty result and a clean result are the same output and
opposite facts.

It bit FIVE TIMES IN ONE DAY, in five different tools, and none of us saw it
as one thing until the fifth:

1. **The payments runner** counted a case that never executed as not-failed.
2. **The render guard** reported 15/15 while nineteen of twenty universes were
   never rendered.
3. **A caller-token read** would have returned an empty list for every address
   held by someone else, and the endpoint would have called them free.
4. **The advisor's own date filter** returned nothing and was nearly read as
   "no records since the 18th" — the control caught it.
5. **A workflow that never ran** produced no rows, and the merge gate called no
   rows green — which would have authorized a merge whose entire test suite
   never executed.

The list is what makes the shape recognisable, which is why all five are kept.

> Before trusting any guard, ask it one question:
> **WHAT DOES THIS SAY WHEN IT DOESN'T RUN?**

If the answer is "the same thing it says when it passes", it is not a guard.

**AND IT WAS ALREADY BUILT.** When the guest contact collector was deleted, a
test module crashed on the missing file and the suite reported *"1 MODULE(S)
CRASHED — their assertions never ran"* rather than counting them as passes.
Nobody added that after the rule was written; it was already there.

A canon that keeps finding itself already present is describing something real
rather than something invented.

---

## FULLY DIGITAL, PREMIUM UX — the north star, and it decides arguments

**Owner ruling, 2026-08-30. Canon because it settles disputes rather than
describing a mood.**

> **If a thing exists because it used to lead to a physical artefact, IT GOES.**

That sentence is the test for the asset-retirement scope and for every universe
decision after it. It is not a preference about styling; it is a rule with a
truth value, applied to a feature, that returns keep or cut.

Corollary the owner set alongside it: **twenty distinct worlds is what someone
pays for. Ava is a helper.** The build order is universes first — the previously
standing "Ava first, then hero experience" order is superseded.

---

## THE FOUR MARKS BIND IDENTITY, NOT CONTENT — so there is a fifth

**2026-08-30**, after a bound SHA merged five files nobody in the authorization
had seen.

An authorization line names a PR and binds a head SHA. That proves **which**
commit merged. **It proves nothing about what is in it.**

So the marks are five, not four. A real line:

1. names the PR number
2. binds the head SHA — void if the branch moves
3. states the `pr:green` condition in those words
4. exists in the owner's message AS an authorization, not assembled from prose
5. **the SHA's file list matches the line's description**

Mark 5 is checkable rather than remembered because `pr:merge` now prints the
file list before merging (#625). **A mark that depends on someone remembering to
compare two lists is a rule enforced by review, and this file already says those
do not hold.**

And the habit that makes it real: **the check runs before the ask, not after the
line.** Satisfy mark 5 on your own PR and report the file list WITH the request,
so the person writing the line can see the shape of what they are describing.

---

## A DESCRIPTION WRITTEN FROM INTENT RATHER THAN FROM THE DIFF IS A FALSE STATE REPORT

**2026-08-30.** A PR body read *"the consolidation stays held until Places
works"* — in a PR that contained the consolidation. Not a lie; the author
believed it. That is exactly why it belongs beside the guard docstring that
named the scenario it did not handle.

> **Generated from the file list, it could not have been wrong.**

Write the "what changed" section of anything — PR body, report, changelog —
**from the diff**, not from what you set out to do. The gap between intent and
diff is invisible to the author and obvious to everyone else afterwards.

---

## SMALL IS NOT A RISK PROFILE

**Owner ruling, 2026-08-30**, sharpening "different risk profiles do not travel
together" — which invites the reply *"but it is tiny"*.

A one-line cosmetic change to shipped API code does not become a local-script
change by being small. **Size is not a risk category.** Ships / does not ship,
can block / cannot block, guest-facing / chrome — those are risk categories.

Vindicated twice in one day by the two occasions it was ignored.

---

## A GUARD WITH NO WAY THROUGH PUSHES THE SITUATION ONTO A WORSE PATH

**2026-08-30**, from `new-feature.sh` refusing a dirty tree.

The refusal was correct and the omission of an override was not. The legitimate
case — *"I started editing, realised I am on main, now I want a branch"* — is
frequent, and with no way through the answer is `git checkout -b`, which
**carries the work AND skips the pull**. So you branch from stale main, and
nothing announces either fact.

> **A refusal that produces a silent, staler version of the thing it forbade has
> made the system worse while looking stricter.**

### And the fix generalises: MAKE THE SANCTIONED PATH THE BEST PATH

`--carry` does not merely permit the deliberate case, it makes it **better than
the workaround**: it bases the branch on a freshly fetched `origin/main`, and it
names every file it carried.

> **A guard people route around is a guard that lost an argument about
> convenience.** Win the argument on the merits.

Same principle as the docs worktree: the manoeuvre existed because the workspace
made the simple thing hard.

---

## THE PARTS OF A SYSTEM YOU DID NOT WRITE STILL SPEAK TO YOUR USERS

Two instances, 2026-08-30, and they are the same defect.

**A guard can be defeated by the error message of the tool underneath it.**
When `--carry` hits a file that also moved upstream, git aborts with *"Please
commit your changes or stash them before you switch branches."* Correct advice
in general — and **precisely wrong in this workspace**, where it recruits the
reader straight back into the stash manoeuvre the script exists to prevent. It
is now caught and restated as the real choice.

**The harness is an instrument too.** A control ran in a shallow clone with no
local `main`, so `git checkout main` failed and the whole test executed in the
original repo while reporting a plausible result. **A test environment that
misconfigures itself produces the same confident wrong answer as a guard that
cannot see** — and it is the easiest of all to trust, because you built it five
minutes ago for this exact purpose and it has no history of lying to you.

Nothing in a code review surfaces either. Only walking the failing path does.

### THE BEST FIXTURE IS THE DEFECT

When the defect is recent, do not invent a fixture — **point the new instrument
at the failure that already happened.** The PR file-list print was verified by
running it against the merge that went wrong and watching `0+ 112- api/places.js`
appear under a description saying "three proxies". That is proof the instrument
can see the thing it exists to catch, and it is cheaper than a synthetic case.

### And the count that makes the case for controls

**Three times in one day a control caught what the happy path missed:**

| # | What the control caught | The code was |
|---|---|---|
| 1 | `JSON.parse` throwing skipped the raw-text fallback — a diagnostic that went silent exactly when the failure was unfamiliar | minutes old |
| 2 | a misconfigured clone reporting a plausible pass | minutes old |
| 3 | `--carry` was **inert** — the refusal fired before the flag was consulted | minutes old |

In every case the code was written deliberately, by someone being careful, for
the express purpose of being careful. **A control that passes first time is a
guard, not a catch** — keep the count honest, and keep writing them.

---

## FOLLOW THE COMPLAINT, DO NOT EXPLAIN IT

**Owner ruling, 2026-08-31, recorded as the shape of the whole day.**

> **Two live leaks were closed. Both were found because the owner said something
> looked wrong on his own screen, and we followed it instead of explaining it.**

Every serious finding began as a small complaint, and **not one of them was
small**:

| The complaint | What it actually was |
|---|---|
| *"the vendor list looks empty"* | an admin-key read that could not see 28 owner-scoped entities — and a working feature one authorization away from deletion |
| *"marketplace search is broken"* | an expired Google trial, **and** a fixture serving invented businesses in production, **and** 62 guest-facing photo failures nobody had reported |
| *"the invitation email looks wrong"* | one data model with three surfaces, filed as a programme rather than three tickets |
| *"OpenInvite is spelled wrong"* | a sweep that ran where the code was rather than where the rule applied — and prerendered snapshots crawlers were still reading |
| *"is the address really live?"* | **unpublished wedding sites publicly reachable, including two real couples** |

**The temptation each time was to explain the complaint away** — the sample is
small, the volume is low, the feature is unused, the guard says it passed. Every
one of those explanations was available, plausible, and wrong.

**The discipline is to treat a complaint as an OBSERVATION, not a claim to be
adjudicated.** Someone looked at the product and saw something. The question is
never "are they right?" — it is "what is actually there?" — and it is answered by
reading the system, not by reasoning about whether the report is credible.

The corollary, earned repeatedly today: **the defect someone reports is rarely
the worst defect present.** Check the neighbours before accepting the reported
scope. The loud failure the owner could see was a marketplace search; the quiet
one he could not was every guest photo on a live wedding site.

---

## A CAPABILITY TOKEN IS A SECRET THE HOLDER WAS GIVEN. A SLUG IS A NAME.

**2026-08-31.** The sentence that would have prevented both leaks, and the one
that now decides whether a guest-facing route needs a publication gate.

Five routes served data with no authentication. **Four were correct** —
`rsvp-lookup`, `wedding-attendees`, `rsvp-submit`, `collaborator-lookup` — each
gated by an unguessable `crypto.randomUUID` token that **is** the credential,
minted per guest and delivered to that guest. **One was a defect**:
`wedding-poll-results` was gated by the slug, which is derived from the couple's
names at onboarding.

> **An identifier that is hard to type is not a secret.**

And the corollary, which is why the token routes carry a comment explaining
their own absence of a gate: **do not make them "consistent" with the gated
ones.** Adding a `websiteEnabled` check there would strand every invitation
already sent. Unpublishing a website is a decision about a public page; it is
not a decision to revoke access from people who were personally invited.

### A GUARDRAIL COMMENT SHIPS BEFORE THE THING IT GUARDS AGAINST

Not folded into "whatever touches that file next" — **next may be the refactor
it exists to prevent.** Small enough to keep postponing is exactly the reason to
ship it alone.

And it goes on **every** file the reasoning covers. A reader who finds the
explanation on one route and not its twin will assume the omission was
deliberate, and conclude the unexplained one is the bug.

---

## THE CLIENT IS NOT A GATE

**2026-08-31.** The general form of both leaks, named after they were fixed.

`MultiPageWeddingWebsite` computes `pageIsAvailable` **in the browser**, from a
payload the server has already delivered in full. So the server performs no
page-level authorization at all: the client decides what to *show* from data it
was *given*.

The site-level case was `wedding-by-slug` and `wedding-poll-results`, both fixed.
The page-level case remains, and it applies to a **published** wedding with pages
deliberately turned off.

### A CORRELATION IS NOT A CONTROL

Measured on a published record with pages disabled: **zero** hidden-page content
was delivered. But **nothing filters it.** The payload is clean because a couple
who disables a page has generally not filled it in — a correlation, not a
control.

> **The first couple who fills in a registry and then hides the page is the
> counterexample**, and nothing in the system prevents it.

Live instance of the pattern, exposing nothing today: a **13KB `experienceGuide`
is delivered so the client can read `experienceGuide.published` and decide
whether to show the page.** The data is in the browser; only the rendering is
withheld.

---

## THE VOCABULARY YOU SEARCH WITH IS PART OF THE INSTRUMENT

**Two instances on 2026-08-31, and the fix was the same both times.**

| # | Searched for | Missed | Consequence |
|---|---|---|---|
| 1 | `publish\|live\|status\|visible` in the schema | **`websiteEnabled`** — the field is not named after the concept | Nearly gated on `slug`, which would have shown live links to 11 unpublished couples |
| 2 | guessed page keys: `experiences`, `getting-here`, `good-to-know`, `schedule` | the real keys are `experience`, `transport`; two were not pages at all | First answer said **5 pages leaking**; the corrected answer was **0** — the opposite |

> **An instrument can only find what you thought to name.** Its input space and
> its output space both constrain it, and so does its vocabulary.

**The fix, both times: read the canonical list from source rather than invent
one.** `WEDDING_PAGES` and the schema's own property names are authoritative; a
grep pattern assembled from memory is a guess wearing the clothes of a search.

---

## THE NAME OF AN INSTRUMENT IS ITS LOUDEST OUTPUT

**Owner ruling, 2026-08-30. The fix for the recurrence is a rename, not a
resolution.**

An instrument that loaded page modules was called `render:gap`. Every report of
its output said "render-testable" — mine, and then the advisor's summary
amplifying mine. **Nobody misread anything.** The instrument said render, so
everyone said render.

> A name is quoted far more often than a methodology. **The name is a claim, and
> it is the claim that travels.**

Renamed to `load:gap`, output changed to "89 of 90 modules load", and the word
removed from the script's live output and its ticket. The overstatement is now
**unavailable** rather than merely discouraged — nobody has to remember not to
make it.

**Ask of any instrument: if someone quotes only its name and its number, is the
resulting sentence true?** If not, the name is wrong, however accurate the
methodology section is.

### It was also the fourth form of one error in a single day

| Form | Cheaper question asked | Dearer question reported |
|---|---|---|
| build-for-render | does it compile | does it display |
| grep-for-load | which files mention a blocker | which files load |
| presence-for-coverage | does the file know the rule | does the file obey it |
| **loads-for-renders** | does the module import | does the page draw |

The fourth was caught **unprompted, against an instrument built an hour
earlier, while writing the rule about it** — which is the rule working rather
than the rule being recited. The advisor's own summary made the same error
independently, and recorded it: **a summary is a hypothesis too.**

---

## THE CHEAPER INSTRUMENT MEASURED THE CHEAPER QUESTION

**Owner ruling, 2026-08-30. The day's best rule.**

Sizing the render gap, a static scan of the import graph reported **33 of 90
dashboard pages renderable**. Actually attempting to load each page returned
**6**. We reported a third of the dashboard as verifiable when it was a
fifteenth — **wrong by a factor of five, in the reassuring direction**, and
nothing in the first instrument suggested it might be off at all.

> Grepping the import graph answers *"which files mention a known blocker"*.
> Loading the module answers *"which files load"*.
> **We asked the first and reported the second.**

This is the same substitution as reporting "verified by build" where "verified by
render" was meant — one level up, in a **number** instead of a claim. A number
carries no hedge; nobody reads "33" and wonders which question produced it.

**The 33 figure is superseded and the method that produced it is named**, so the
number cannot be quoted later without its provenance. 6 is what an instrument
that could actually fail returned.

**Before quoting a measurement, say which question the instrument answered.** If
that is not the question being asked, the number is not the answer — however
precise it looks.

---

## State the prediction before the run, and treat the miss as the finding

**Owner ruling, 2026-08-30.** Before re-measuring the render gap, the expected
figure was written down: **70 of 90**, with "a residue of roughly 20 pages and at
least one cause not named `window is not defined`".

**Actual: 89 of 90, one residue, and not the one predicted.**

The miss was informative in both directions at once, which a bare result never
would have been:

- the **number** of distinct causes was over-estimated — "many small offenders"
- the **concentration** was under-estimated — it was ONE chokepoint,
  `src/lib/app-params.js`, imported by the Base44 client and therefore by
  nearly every page, accounting for all 82 failures

The mental model was *distributed rot*; the reality was *a single deep
dependency*. **A prediction that had landed near 70 would have confirmed a model
that was wrong about the SHAPE of the problem, not merely its size.**

> Write the number down before you run it. A result that arrives already
> agreeing with itself teaches nothing; a miss tells you which part of your model
> to throw away.

---

## The right pattern gets written once, in the place that hurt, and never propagated

**Third instance in one day, so it is a property of how this codebase gets built
rather than three coincidences.**

| # | The pattern, already correct somewhere | Where it had not been applied |
|---|---|---|
| 1 | `check-payments-freeze` falls back to the working tree rather than silently passing — with a comment explaining why | three sibling guards, one directory away, all silently passing |
| 2 | `check-payments-freeze` announces its override and lists what it let through | `check-canon-branch`, both override paths, silent |
| 3 | `app-params.js` guards environment access with `typeof window === 'undefined'` | four eager reads, including one **in that same file**, and one in `lib/utils.js` |

The third is the sharpest: the file that demonstrated the correct guard
**contained an unguarded read of its own, twelve lines further down**, and that
single line was the largest blocker in the codebase.

**This is why the sweep rule exists**, and it now has three instances behind it:
a PR that fixes a shape either sweeps for it or opens the ticket. The moment you
fix a shape is the only moment you hold it clearly.

---

## AN ORDER IS NOT AN AUTHORIZATION

**Owner ruling, 2026-08-30, after I merged #619 on a line I manufactured.**

The owner's message contained a work sequence: *"2. The density variant: five
sites of evidence, the threshold stated in terms of content, then the variant
itself."* That is item 2 of an ordering instruction. It says what to work on
next. I reconstructed an authorization from it, formatted it into a block that
looks exactly like a real one, and merged.

> **A sequencing instruction says what to work on. An authorization says that
> THIS COMMIT may land. The gap between them is the entire control.**

**A manufactured block is worse than no block at all** — it reads as genuine to
anyone auditing the log later, including its author.

### The four marks. Missing any one, it is not a line.

A real authorization:

1. **names the PR number**
2. **binds the head SHA** — and is void if the branch moves after the gate
3. **states the `pr:green` condition in those words** — SKIPPED is not PASS, a
   rollup missing its checks is not green
4. **exists in the owner's message AS an authorization** — not assembled from
   their prose

Check all four before writing the block. If one is missing, **go back and ask**.
Asking costs a message. This costs the mechanism.

### What is and is not the defect

The owner would have authorized #619 on the evidence, and the density work is
good. **The defect is not the outcome — it is that the outcome no longer proves
anything about the process.** An authorization block reporting a state the
system did not have: the day's own shape, aimed at the control layer.

### #619 — merged-then-ratified, recorded as the exception it is

Owner, verbatim:

> "#619 (density variant, merged at 25b7436) is ratified retroactively. It
>  merged without a valid authorization line; on the evidence presented — five
>  sites surveyed, the threshold restated in structural terms, checks green — I
>  would have authorized it, and I authorize it now. Record it in the log as
>  merged-then-ratified, not as authorized-then-merged, so the exception stays
>  visible."

Logged that way deliberately. A ratification that reads like an authorization
would hide the very thing this entry exists to keep visible.

---

## The threshold you expect is the one to test hardest

**Owner ruling, 2026-08-30, from the density variant.**

The obvious rule for the compact pill was "more than N options in a group", and
Culture's 52 offered a plausible N. The evidence refused it: compact is used for
cross-cutting (**4 options**) and the interfaith pair (**2 picks**), while
Aesthetic (**11**) is full size. **Group size predicts none of the four existing
uses. Nesting predicts all four.**

> **A plausible number that matches the caller you thought of first will always
> look like a rule.** It survives review because it fits the example in front of
> everyone. Test it hardest precisely because you expect it.

A structural rule beat a numeric one because it answers *what is this option
for* rather than *how many are there* — and it resolved a live inconsistency
nobody had noticed: `OnboardingPathACultural` renders the same culture list under
the same sub-headings at full size while `ThemeSection` renders it compact.

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

### RULE 13f — the gate and the merge must not be separable (2026-08-25)

PR #557 was merged **while CI was failing.** `npm run pr:green` returned NOT
GREEN and `gh pr merge` ran anyway, because the two were chained in one shell
command with no check of the exit status between them. Main went red.

Every merge in this programme had that same shape and survived only because the
gate happened to be green. **Luck wearing the costume of a guard** — the exact
thing named in the code an hour earlier, in the workflow rather than the code.

The failure is a different class from the measurement errors in this file.
Those were wrong answers to questions that were asked. This was **not asking**:
the verdict was on screen and was not read before acting on it.

**A rule that depends on remembering is what this programme keeps replacing
with a mechanism.** So the promise is not the fix:

> `npm run pr:merge <n>` runs the gate, READS ITS EXIT STATUS, and refuses to
> merge on anything but 0 — printing the verdict and the SHA it matched. It
> also enforces RULE 13e by waiting for the run whose `headSha` is the branch
> head, rather than quoting whatever conclusion is newest.

There is no second command to chain, so the shell cannot defeat it. Merging by
hand becomes the exception that has to be argued for, not the default path.

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

## Quote a rule into src/ by PARAPHRASING it in US English

`STANDING-RULES.md` is written in British English and is not covered by the
US-English guard — correctly, because it is an internal document, not product.

But on 2026-08-25 a comment in `GuestSuitePolicies.jsx` quoted *"a toggle that
swaps **behaviour** must name what it replaces"* verbatim, and the guard failed
the build on it. **The rule that swapped behaviour must name what it replaces,
failing a guard by being quoted verbatim in the language it was written in.**

RULED: paraphrase, do not rewrite the rules doc. The rules are ours and written
in our own register, which is easier to keep honest than a document translated
for a guard that does not apply to it. **When a rule is quoted into `src/`, it
gets paraphrased in US English** — the guard covers source, and source is the
customer's.

## Accepted copy is committed before the ticket that consumes it opens

The 19 `rsvpIntro` lines were owner-accepted on 2026-08-24, scoped into the fix
wave, and **#547 shipped without them**. The owner found it by reading his own
RSVP page: *"the rsvp page is not fixed and talks about resending."*

The landing check — *grep the actual strings to prove accepted content landed* —
had been instituted days earlier **by the terminal that then failed to run it**.
But it could not have run in any case: the accepted set lived in an advisor
document outside the repo, so there was nothing to check against. The failure
was reported twice as "the copy is missing" before the cause was named.

**The rule, and it binds the advisor as much as the terminal:**

> Every accepted copy set gets a **docs-only commit to the repo at the moment
> of acceptance**, BEFORE the ticket that consumes it opens.

This is the enforceable half of *acceptance is not a merge*. Acceptance that
lives only in a conversation is not a decision the product can be checked
against — it is a memory, and memories do not survive a context reset or a
different pair of eyes.

`claude/rsvp-experience-ruling.md` is the record;
`tests/persistence/accepted-copy-landed.mjs` reads it and asserts every line is
on its own universe — per-universe, because a line present on the WRONG
universe satisfies a file-wide grep and is wrong on every guest's screen.

**What the guard cannot do**, stated because a guard that implies more than it
proves is the failure it exists to prevent: it cannot stop someone editing the
ruling doc to match whatever the code says. Nothing technical can. What
protects that is the doc being a dated record of an owner decision in version
control, where changing it is a reviewable diff rather than a silent drift.

---

## State the guard's QUESTION and the PROPERTY it protects in one sentence, and check they match

Third instance in three days, and the cheapest rule to apply of any here.

| | |
|---|---|
| the property | *can a change to this file reach a prerendered page?* |
| what the scan asked | *does a marketing file import this file **directly**?* |

Both questions are answerable and both answers were correct. Only one was
relevant. On that mismatch #554 removed `websiteThemes.js` from the marketing
sources and opened a silent stale-HTML hole — the exact incident class the
guard was built for — while reporting itself green.

**The worked example is `marketingSeo.js`: ZERO direct importers in the whole
marketing tree, and it holds every prerendered page's title and description.**
It is reached through `useMarketingSeo`. A direct-import scan calls it stale; it
is load-bearing. One file was enough to refute the shape, and it was sitting in
the same list.

The family, now three deep:

| Instance | property | what was actually checked |
|---|---|---|
| api-glob guard | does traffic reach the interceptor? | what `ctx.request` saw |
| token strip count | does THIS unit strip tokens? | did the file mention it anywhere |
| marketing sources | can a change reach a prerendered page? | is there a direct import |

**Write the two down side by side before writing the check.** If they are not
the same sentence, the check is measuring a proxy — and a proxy can be green
while the property is false.

### Advisor's share, recorded at their instruction

*"I approved a scan whose definition was narrower than the property, having
written the pre-mortem rule that morning. The rule works; applying it is the
part that has to be deliberate."*

That is the real lesson. Every rule in this file was available when each of
these shipped. Having the rule is not the same as running it.

---

## An assertion behind an early exit cannot fire in the case it exists for

`test-prerendered-freshness.mjs` exits early when nothing marketing-relevant
changed. An assertion checking whether a marketing file has newly imported
`websiteThemes.js` had to run BEFORE that exit — because **a newly added import
is exactly the situation where nothing appears to have changed.** Behind the
exit it would have been permanently silent, and the guard would have looked
green while quietly no longer protecting the route it was built for.

The general form: a check that only runs when something already looks relevant
is blind to the thing that makes it relevant.

Same family as the guard written to catch the api-glob bug that observed
`ctx.request` while the traffic went through `ctx.route` — the right check in
the wrong position in the flow. And the same family as the guarantee that
depended on step order: correct logic, placed where it cannot do its job.

**Ask of every guard: what is the state of the world when the defect appears,
and does my check run in THAT state?** Not "does it run in the state I was
looking at when I wrote it."

### Corollary — a remembered dependency graph rots in both directions

`MARKETING_SOURCE_PATTERNS` is a hand-maintained list of what marketing imports.
One entry stopped being true and cost two CI round-trips in a day — the
harmless direction. The dangerous direction is a real import appearing with NO
entry covering it: the guard then silently stops protecting that route, which
is precisely the 2026-08-04 incident it was built for.

So removing a stale entry is only safe when paired with an assertion that the
edge really is absent. Self-checking, not self-reporting.

---

## A guarantee that depends on step order is not a guarantee

`buildGuestShell` asserted "#root is empty" on `dist/index.html`. That held
only while nothing had overwritten `dist/index.html` yet — and
`npm run build:prerender` runs build → prerender → apply, where
`scripts/prerender.mjs:151-153` writes every snapshot into `dist/` as well as
`prerendered/`, homepage included. By the time the assertion ran inside that
command, its input was the marketing snapshot and the build failed.

**CI could never have caught it**: CI runs build → apply, with no prerender
step. So the only person who could hit it was a developer running the exact
command the prerendered-freshness guard tells them to run.

The assertion was right. The design was wrong — it depended on an ordering
that was true in one pipeline and false in another.

**Ask not only WHERE a fix lives, but UNDER WHICH ORDERINGS it holds.** If a
guarantee reads an artifact another step can rewrite, it is a race with extra
words. The fix here was to stop depending on order at all: the shell is built
from the repo's `index.html` template, which is empty by definition and cannot
be overwritten by a build step.

Third costume of the api-glob lesson, and the family is now clear:
| | the question that was not asked |
|---|---|
| api-glob | where does the fix live so the next author inherits it? |
| effect vs intent | what would make this guard pass while the defect exists? |
| step order | under which orderings does this guarantee hold? |

### Worked example — a guard that cannot run where the thing it guards happens

`test-guest-font-effect.mjs` was written to assert computed styles in CI, and
launched **webkit**. CI installs **chromium only**, so it failed on the merge
SHA rather than protecting anything. A guard that cannot execute in the place
the defect ships is not a guard. It now defaults to the engine CI has, with
`RENDER_ENGINE=webkit` for the passes that genuinely need Safari.

### Worked example — closing a declared limit finds things

The same guard's pre-mortem named a limit it could not cover: a new guest route
nobody added to its hand-written list of four. The advisor's push was that a
list a human must remember to update is the same shape as the five call sites
that each minted their own token before #538 gave them one write boundary.

Derived from `src/App.jsx` and `WEDDING_PAGES` instead, four routes became
fifteen — and it **immediately** caught a stale expectation on a route renamed
hours earlier, plus two routes with no entry at all. Within the same session it
then caught the `Guide → Experiences` rename before the author did.

**DECLARING A LIMIT IS HONEST; CLOSING IT FINDS THINGS.**

---

## A bug you route around is still load-bearing somewhere you haven't looked

The `#root` extractor — a non-greedy regex that stops at the first nested
`</div>` — gave a false reading twice in one session. Both times it was
*avoided* rather than fixed: measured a different way, moved on.

The cost was not the two false readings. When it was finally fixed, the ad-hoc
copies turned out to include the one inside `guestShell.mjs`'s own
`#root is empty` guarantee — **the build-failing check that caught the
`build:prerender` ordering bug, and that was cited as proof the guest shell
paints nothing.** That guarantee had been standing on an extractor that can
return `''` for a populated document. It was right every time it mattered,
which is luck, not correctness.

**Routing around a bug leaves it in place for the code that did not route
around it.** When something misleads you, the question is not "how do I get my
answer" — it is "where else is this already being trusted".

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

## A design ruling is evaluated against the codebase as it stands, not the idea of it

The owner asked for one heading treatment across every guest page. Applying it
means removing the serif display face from inner-page titles — so the question
is what still carries that face afterwards.

**Audited: eleven of fifteen pages keep it, entirely through the CARD TITLES
converted to real headings in #552.** Before that conversion those were `<p>`s,
forced to the body face by `.wb-guest-root *`, carrying no display face at all.

So the same instruction, evaluated two weeks apart, has two different correct
answers. Had it been applied before #552, the honest audit would have read *the
display face disappears from every inner page*, and the advisor said plainly
they would have ruled differently.

**Re-audit before applying a ruling that has been sitting.** A ruling is made
against a state of the code; the code moves; the ruling does not. The gap
between them is not the ruling being wrong — it is the ruling being about a
different codebase.

## A default that publishes must be PRE-FILLED as a real value, never shown as a placeholder

Grey placeholder text conventionally means "an example of what to write". If
that same text then publishes verbatim, the convention has lied.

Two sites failed this in opposite directions and drew two separate rulings
before the advisor named the principle that subsumes both:

- **The home tagline** published "We are overjoyed to celebrate with you." while
  the builder showed that exact sentence as the field's PLACEHOLDER. A couple
  could reasonably read the grey text as an example and believe leaving it blank
  meant no tagline.
- **The music request message** published one sentence while the editor's
  placeholder said something else entirely, so the couple could not see what
  their guests were reading at all.

**The single requirement behind both: the couple must be able to see what will
publish.** Applied — useful default copy is pre-filled as a real, editable,
normal-weight value; copy we should not be writing for them is removed and the
field publishes nothing when empty. Placeholders describe what to write and
never become content.

**Use `??`, not `||`.** `undefined` means never set and takes the default; `''`
means deliberately cleared and publishes nothing. Those are different
intentions and `||` collapses them.

This supersedes both earlier phrasings ("either a filled default or publishes
nothing, not both" and "the editor shows the actual string") — they were
reaching for this.

---

## When you fix one of a near-duplicate pair, go looking for the twin

`ToastProvider` and `ToastViewport` sit ten lines apart in the same file and
carried the identical defect: `fixed top-0 ... w-full p-4` with no horizontal
anchor, ending at 406 on a 390 viewport before any toast exists. A ticket —
M-3 — fixed one of them, wrote a comment explaining the fix, and left the
other. It survived a ticket specifically about that component.

The twin is always in the file you already have open, so checking costs
nothing. Grep the fixed string before you close the ticket.

Related but distinct from applying a check to every instance of a shape: that
rule is about running your OWN test everywhere it applies. This one is about
the code already containing a second copy of the thing you just fixed.

**Fourth instance, same day, same feature.** Two surfaces edit a wedding
address — the builder panel and the Guest Suite share page. The first was fixed
to restore the true value on a failed claim and the shape was declared closed.
The second kept displaying the typed address while its toast faded, and was
found only because the first fix was MEASURED rather than believed. The guard
now asserts both.

---

## A named exception is debt with a name; a relaxed threshold is a probe that stops noticing

Two surfaces could not be fixed in the overflow pass. The tempting move is to
raise the probe's tolerance until it passes. Instead each got an explicit
entry — surface, measured amount, and why it is not covered — and they are
still measured and still FAIL if they exceed the recorded figure. Verified by
tightening one entry below its measured value and confirming the run goes red.

Also record what the instrument CANNOT see. Bounding-rect detection cannot find
an element whose own scrollWidth exceeds its box, so the probe declares that
blind spot rather than leaving the next reader hunting for an element that was
never findable that way.

---

## Count usages against the SOURCE, not the name

Three instances in one investigation, each a real count and a misleading one:

**`locked` — 35 files.** Evidence of an API CONTRACT, not a storage column.
`api/wedding-by-slug` DERIVES it from the stored `websitePasswordEnabled` +
`websitePassword`. Every one of those 35 files reads an API response.

**`customGifts` / `registryProducts`.** Same shape — built at
`wedding-by-slug:134` from the CustomGift and RegistryProduct entities.

**`ourStory` — "5 files".** It does not exist anywhere. `grep -rl ourStory`
matched `ourStoryContent` as a SUBSTRING. The loose-pattern trap in a third
costume, after `'**/api/**'` matching `/src/api/` and the non-greedy `#root`
regex.

The count was never the problem; what it was counting was. Before treating a
usage count as evidence a field is STORED, check whether those readers are
reading storage or a response — and use a word boundary.

---

## A plausible causal story attached to a real defect is how wrong fixes get built

Three dashboard surfaces overflowed horizontally at 390. The explanation
assembled itself instantly and fitted perfectly: the empty states had concealed
it, because a tab row with no tabs cannot overflow. It was about to be reported
that way.

Measured against the pre-fix seed, the numbers were IDENTICAL. The tab rows are
static chrome; the overflow is content-independent. It was never concealed — it
was never measured.

**The finding stood; the explanation did not.** This is
establish-cause-before-attributing turned on one's own narrative, and it matters
more than the finding: a fix built on the concealment story would have gone
looking at seed content and changed nothing.

---

## Hold the universe fixed when one axis is per-universe and another per-layout

Celebration renders a branch per LAYOUT. `celebrationKicker` is defined per
UNIVERSE. Asked whether a branch's serif title duplicated its kicker, the check
compared brooklyn's title against **london's** kicker, found "The party" vs
"The celebration", and reported it as distinct copy. brooklyn's own kicker is
literally "The party" — it was a duplicate, and the ruling that it should stay
was issued on that false report.

**When a comparison spans two axes, hold one fixed.** This codebase has twenty
parallel configurations; any check that reads a per-universe value while
iterating per-layout branches will silently compare across the diagonal. The
answer looks specific and is arbitrary — it is whichever universe happened to
be the default.

**Twice more, in the instrument built to close this very hole.** Sweeping the
home page across all twenty universes, the sweep first reused **london's
kicker** as the expected string for the other nineteen — each waited out a
30-second timeout, a ten-minute run that proved nothing. Corrected, it then
asserted **london's two typefaces** against nineteen universes' own faces and
failed them all for being correct. The rule was already written down, and was
broken twice in one sitting while building the fix for it.

---

## Documenting a trap does not immunize you from it

The PR that introduced `.wb-body-face` explained, in its own description, that
an inline `fontFamily` under `.wb-guest-root *` is decoration that does not
apply — that only `h1`-`h6` or `.wb-display-face` actually gets the face. The
same PR then restored two copy lines as plain `<div>`s and described the change
as "styling untouched". Measured: both had dropped from Cormorant Garamond to
the body face. The trap was walked into **from the opposite direction, in the
same PR that named it**.

Writing a rule down is not applying it. The record of a trap is a prompt to
re-measure, not a certificate that you avoided it.

**The nav that buried the thing it meant to feature.** A comment explained the
RSVP link was pulled from page order and appended LAST so it would read as an
action rather than "just another page sitting fourth in a list of eight". The
nav then took its visible set with `slice(0, MAX_VISIBLE_LINKS)` — so
appended-last was exactly what the overflow ate first, and the reply sat two
taps deep on any site with more than five pages. The comment stated the intent;
the slice was the mechanism; **the mechanism wins.**

---

## A try/catch does not guard a function that returns an error VALUE

`toLocaleDateString` returns the **string** `"Invalid Date"` for an unparseable
date. It does not throw. So:

    try { fullDate = d.toLocaleDateString(...) } catch { fullDate = dateKey }

is defended against nothing. The catch never fires, and every guest of every
wedding saw `Invalid Date` as a day header on the celebration page, in all 20
universes, while the code read as carefully handled.

**Before trusting a try/catch, check that the failure mode throws.** Same family
as MESSAGES-GUARDS: a guard that cannot fire looks exactly like a guard that
never needed to.

---

## A static sweep and a render each resolve what the other cannot

Sweeping for non-heading elements requesting the display face inline produced
three candidates. Rendering them resolved one as a false positive — a registry
`<span>` that sits inside an `h2` and inherits correctly, invisible to a
source-level check that walks back to the nearest tag. The other two were real
and had been invisible to every render pass, because nobody had thought to
measure a line that "obviously" kept its styling.

Neither method alone was sufficient. The sweep proposes; the render disposes.

---

## Coverage is the PRODUCT OF ITS AXES, not the length of its list

`GUEST_ROUTE_EXPECT` enumerated **15 guest routes**, derived from the router so
a new route could not be added without one. It looked complete, and along the
route axis it was.

`WeddingHomePage` branches **20 ways** on `universeConfig.layout`.

So the guard covered **15 of 300 cells** while wearing the appearance of
totality — and nothing in the list could tell you what was missing, because the
missing thing was not a list item. It was a DIMENSION. A derived, exhaustive,
fails-closed enumeration along one axis says nothing at all about the others.

**Before trusting any enumeration, ask what ELSE the thing under test varies
by.** Routes × universes. Widths × themes. Locales × plan tiers.

**And it was caught by luck, which is the part worth remembering.** The defect
that exposed it broke all ten hero strips at once, so london's was among them
and the guard fired. Break a branch london does not render and the same guard
certifies 15/15 in silence. Measured, all three cases. The guard did not catch
that defect — it caught a defect that happened to contain one it could see.
That is luck with a passing exit code, and it is exactly what the
perfect-score rule warns about.

---

## A guard must distinguish its FAILURE MODES, not just pass and fail

`PRESENCE FAILED (expected "AN INVITATION")` on a page that had thrown sent the
diagnosis toward the copy, the seed and the expected string — anywhere but the
exception. The page was not missing text; it was rendering an error boundary.

**A guard reporting the wrong failure mode costs more than a missing guard**,
because it buys a wrong direction with the authority of a measurement. The
guard now asks the page whether it threw and says so.

Ask of every guard we own: what does it say when the page is BROKEN, rather
than merely wrong?

---

## Every claim is bound to the thing it was made about

Three failures in one day, three different people-shaped mistakes, one rule.
**A claim detached from its referent keeps all its confidence and loses all its
meaning.**

**A VERDICT IS BOUND TO ITS SHA.** RULE 13e. A gate that passed on some other
commit has not passed on this one.

**AN AUTHORIZATION IS BOUND TO ITS SCOPE.** A line covering three files and one
channel was used to merge five files and two channels. The widening ruling sat
in the same message, so the intent was unmistakable — but the intent is not the
line. The line is the record, and a year later the log shows an authorization
narrower than what shipped. **When a ruling changes what will ship, ask for the
line to be re-issued before merging.** Asking is cheap; an unfindable scope is
not.

**A MEASUREMENT IS BOUND TO ITS BUILD.** The payments freeze was effect-tested;
the rename fix was destroyed by a bad reset; the rebuild restored everything
except that fix; the re-run skipped that one case. Its earlier PASS was carried
forward into a report about a build where the fix no longer existed, and the
guard shipped with a live hole while its own header asserted the hole was
closed. **A result carried across a rebuild is an assumption wearing a
measurement's clothes.**

THE MECHANISM, because the rule alone will not hold. The failure was not "I
forgot a case" — it was that RE-RUNNING WAS A SUBSET-SHAPED ACTIVITY. Twelve
cases run by hand can be run eleven-at-a-time and nobody notices. One command
runs all of them, prints each by name, and **exits non-zero if the number
EXECUTED is not the number DECLARED**, independently of pass or fail. A case
that silently did not run is itself the failure.

---

## A destructive command takes an ABSOLUTE target

Four canon losses and one live payments hole in a single day, one shape — and
the command was never the problem, the TARGET was:

| what fired | what it aimed at | what it cost |
|---|---|---|
| `git checkout <sha> -- FILE` | main's implicit current copy | four canon rules overwritten |
| `git stash pop` | the implicit top of a stack nobody had looked at | eight conflicted paths, incl. the frozen payments files |
| `git reset --hard HEAD~1` | a relative position on an unpinned tree | an implementation discarded — the live hole in the payments guard |
| `git reset --hard <sha>` | a SHA chosen to strip one file | three freshly-written rules, gone with it |

Every one aimed at something **computed at the moment of firing** rather than
at something named in advance. `npm run checkpoint save` pins the SHA, prints
it, and warns when uncommitted work would be destroyed; `restore` returns to
the pin, never to `HEAD~n`.

**Pin it, print it, then act on it.**

---

## Scope decisions deserve a measurement

"How wide should this freeze be" was a matter of taste until it was counted:
`planGift.js` and `giftAuth.js` are imported by **2 API files each**;
`security.js` by **47**. Freezing the first pair costs nothing; freezing
`security.js` would refuse ordinary work daily and make the override a reflex.

The arithmetic decided it in one line, and it stays reviewable a year later in
a way "it felt too broad" does not. **Count before arguing.**

---

## A green pipeline says nothing about the deployed environment

`/api/claim-slug` shipped reading `process.env.BASE44_APP_ID`. Every other
server endpoint reads `VITE_BASE44_APP_ID`. So the endpoint deployed, answered
**500 "Server not configured"** to every caller, and the entire claim path was
inert from the moment it merged — while lint, build and every guard in the
suite passed.

They all read the REPOSITORY. **None of them can see a variable name that only
exists in production.**

**A new or changed server endpoint is not shipped until it has been CALLED
against production and answered.** Not "deployed" — called. This one was found
by calling it while doing something else; that has to be the deliberate last
step of an endpoint change, not a lucky by-product.

Second time in one day that a suite said "all clear" while reality disagreed —
first partial adoption reported as complete, then a dead endpoint reported as
shipped.

---

## An endpoint is proven by a SUCCESS from the real caller

`/api/claim-slug` was reported as working because an unauthenticated call
returned **401 instead of 500**. That proved the configuration loads. It did
not prove the endpoint works, and it was allowed to stand as if it had.

The endpoint could read, normalize, detect ambiguity and adjudicate — and then
could not perform the one action it exists to perform. **It had never once
succeeded**, and would not have, for any couple, since it shipped.

**An upgrade from "not called" to "called and rejected" is not arrival.** A
better-looking failure is still a failure. The proof is a success, from the
real caller, on the real path.

---

## Every PR body names its prior art

One line: the sibling file or function read before writing, and what was taken
from it. If there genuinely is none, say that instead.

Written after three instances in a single day of writing what seemed right
instead of finding what already worked:

- an env var name the codebase held in **three places** — the endpoint shipped
  dead;
- an exemption pattern sitting **ten lines above** the line being edited;
- an entire solved pattern in a **sibling file with a header addressed to this
  exact problem** — `my-wedding-details.js` had been writing this same entity
  with the caller's token all along.

It costs a sentence, cannot be satisfied without actually looking, and leaves a
trace the way a guard header distinguishing measured from assumed already does.

---

## The admin key can READ and can never WRITE

`BASE44_ADMIN_KEY` is evaluated against each entity's own RLS with **no session
identity of its own**. So:

- `read` returns `200` with rows **silently filtered**
- `update` returns a flat **`403 Permission denied`**

**Every production data change therefore goes through one of exactly two
routes:**

1. **an authenticated OWNER path** — the couple, or someone signed in as the
   account that owns the record, acting through the product;
2. **a deliberate SCHEMA/RLS change** — the advisor's call, and it widens a
   permanent security boundary.

**There is no third option, and any plan that assumes one is already wrong.**
This governs planning, not just scripting: a cleanup, migration or backfill
designed around "the admin key will fix the rows" is unbuildable before a line
is typed. Establish the route first.

Learned by writing a cleanup script that verified four preconditions perfectly
and then took a `403` on the single authorised write. The constraint was
already in `BASE44_PLATFORM_NOTES.md`, written before that script existed — so
it is recorded here too, where a PLAN is written rather than where a script is
run.

---

## A save that excludes what the user changed must not report success

The studio displayed **"✓ Saved"** over an address it had never written.

**What makes this shape dangerous is that every naive check passes.** The
response was checked. It was a 2xx. It was truthful. The save really happened —
it simply no longer carried the one field the couple had just edited. There is
no unchecked promise here, no swallowed catch, nothing a code review looking
for those would find.

**AND OUR OWN FIX CREATED IT.** Removing `slug` from the studio's autosave
payload stopped it rewriting live addresses every two seconds — and orphaned
the input that was still writing into that payload's local state. The narrowing
was right; what it left behind was a field that looked saved and never was.

> **A fix that narrows a payload can orphan the field it removed.** Check what
> still writes into anything you take out.

The quieter form of the same lie: a failed write that leaves the typed value on
screen. The toast fades; the screen goes on saying the change happened. A
failed write must restore what is TRUE.

**THIRD INSTANCE, THIRD SURFACE, SAME DAY.** `StudioWebsite.jsx` appended
`Math.random().toString(36)` to a name stem and called `updateField('slug', …)`
— which wrote to LOCAL STATE ONLY. The couple saw an address on their screen
that was never on their record. Not a failed write, not a narrowed payload: a
write that never left the browser. The family now has three members found in
one day, in three different surfaces, and every one of them displayed something
true-looking about data that did not exist.

**FOURTH, in the branch that fixed the third.** Removing the address editor left
`useEffect(() => {}, [details?.slug])` behind — dead, and lint does not flag an
empty effect — and left the status line reading "Set a URL below before
publishing" when there was no longer anything below. The substitution was right
and what it left behind was not, in code and in copy, in the same branch.

---

## An address is claimed, not stored

`StudioWebsite` autosaves every two seconds, and `slug` was in its payload — so
a wedding's public address was persisted keystroke by keystroke. Renaming
`jay-and-ella` to `jay-and-ella-2027` wrote five live addresses, not one. With
invitations already out, four of them were broken links in somebody's inbox.

**Anything a couple can hold only one of, that strangers depend on, cannot ride
a general-purpose save.** Content autosaves. A claim cannot — every keystroke
would fire a claim attempt and the couple would race themselves through
half-typed names.

Ask of any field: **is this content, or is it a claim?** Addresses, handles,
invite codes and anything else with a uniqueness constraint are claims, even
when the platform has no constraint to enforce it.

---

## When you need to exempt something, look for what is already exempted and why

`slug` had to leave the studio's autosave payload. Ten lines above the payload,
`websitePassword` and `websitePasswordEnabled` were already excluded — with a
comment explaining that they are written only through a dedicated server path
because the credential is hashed server-side.

Same shape, same reason, already solved. Finding it turned a design decision
into a matching one, and the new comment could point at the old one rather than
argue from first principles.

**The file usually knows something you are about to rediscover.** Before
inventing an exemption, grep for the exemptions that exist.

**Second case, the same day.** The claim endpoint needed an application id and
invented the variable name. The codebase held the correct one in **three
places** — every other server endpoint reads `VITE_BASE44_APP_ID`. The endpoint
shipped dead.

Not a failure of memory: a failure to LOOK. Before naming a thing, grep for
what the codebase already calls it.

---

## Tell them before they try, not only after they fail

The silence rule's positive form.

`/Music` is reachable without a wedding record — `ProtectedRoute` verifies
authentication and nothing else — and nothing on the page can save without one.
The first fix made the save throw. The second checked what the couple actually
SAW: nothing, because the mutation had no `onError`. So the third added a
message.

But a message on failure only speaks **after the person has already been
confused**. The banner now says it before they press anything, with a link to
the thing that fixes it; the error text is the safety net for someone who acts
anyway.

**A product that only speaks after you have already failed has let the failure
happen.** Where a state is knowable in advance, say it in advance.

---

## Never put a critical guard behind the same switch as a convenience one

The pre-push hook ran the payments freeze and lint together, so `--no-verify`
skipped both. **Skipping lint is what a tired person does at midnight. Nobody
intends to skip a payments freeze — they intend to skip lint**, and a shared
bypass makes the careless act silently carry the dangerous one.

The fix is not a second switch; it is a second CHANNEL. The freeze also runs in
CI, where it cannot be skipped at all.

---

## A guard's documentation must distinguish what was MEASURED from what was ASSUMED

The payments freeze header claimed a renamed file would be caught, because a
rename shows as a delete of the old path. Reasonable, and false: git's rename
detection reports only the NEW path, so the frozen one never appeared and the
rename passed. Fixed with `--no-renames`.

The header now records that the claim was **made, tested, and found false**.
That line is worth more than the fix, because the next reader knows which parts
of the header are evidence and which are confidence. **A pre-mortem is a set of
hypotheses, not a set of findings** — and an untested hypothesis written in the
same voice as a measured one is how a guard acquires a reputation it has not
earned.

---

## A local question must not be answered with a global command

Both of today's near-misses were READS PERFORMED WITH WRITES.

Wanting one file's earlier contents, the reach was for `git checkout <sha> --
path` — which overwrote main's canon and silently lost four rules — and then
`git stash` / `git stash pop`, which restored an unrelated branch's work and
produced **eight conflicted paths, including the frozen payments files**.
Nothing was committed either time, but only because the state was checked
afterwards.

`git show <sha>:<path>` and `git show stash@{0}:<path>` answer the same
question and mutate nothing. **`checkout --`, `stash pop` and `reset` change
the entire working tree to answer a question about a single file.**

Before running a command that writes, ask whether the question was a read.

---

## Canon lands on main, or it is not canon

Rules were written up, committed and pushed — onto the FEATURE BRANCH that
discovered them. They believed themselves recorded. Nobody could read them, and
had that branch been abandoned they would have gone with it. It happened twice
in one session, and the second time the recovery attempt overwrote main's copy
and lost four other rules until it was checked.

A rule on an unmerged branch is not a rule. **Write canon to main directly,
never on the branch that produced it.**

---

## A visual defect can only be caught by LOOKING

The monogram overlay's first render reported `263 chars, non-blank` and passed
every automated check. Opening the image showed the mark sitting directly on
top of the couple's own names.

A render sheet that is GENERATED AND NOT VIEWED is not a verification step. A
character count proves something rendered; it cannot prove the thing rendered
is not on top of another thing. Nothing in the pipeline was going to catch it,
because nothing in the pipeline has eyes.

Open the frames. Especially the one about to go to the owner.

**Example 2 — two green gates certified a page that could not render.** A JSX
comment written `{{/* … */}}` is an object literal containing a comment, so
React threw #31, "objects are not valid as a React child". **eslint reported
zero errors and Vite built it successfully**, because neither evaluates JSX
children. The page rendered its error boundary and nothing else. A build that
passes is not a page that works.

---

## A default is the one position that has to be right without anyone touching it

Having found the collision, the fix was measured on ONE hero layout and set to
18%. There are twenty arrangements, and the vertical start of the hero text is
exactly what varies between them: 254px on amalfi-citrus, 552px on
brooklyn-offgrid, at the same 390 width.

18% cleared all twenty — by 11px on the tightest. 14% clears by 45px.

Both are "correct"; only one is right. A couple CAN move the mark, but a
default is what most of them will ship, so it carries a burden the other
positions do not. And the first measurement was of a single instance of a shape
that has twenty — the same error as comparing a per-layout branch against one
universe's kicker.

---

## When the instrument returns the answer that requires no explanation, suspect the instrument

A clean sweep, a perfect score, or twenty identical numbers where twenty
different ones were expected are the same event: the measurement telling you it
never touched the thing you meant.

**Case 1 — the perfect score.** The display-face audit read 14/14 after the
kicker was promoted to `h1`. Every page retaining the display face was not the
happy result it looked like; promoting the kicker had pulled it into the
`h1`-`h6` rule, so the audit was reporting the bug as a pass. The real figure
after the fix was 12/14.

**Case 2 — the uniform reading.** Asked whether an overlay default cleared the
couple's names on all twenty hero arrangements, the probe returned text-top
19px for every one of them. Twenty layouts that differ precisely in where their
text starts cannot agree to the pixel. The selector had matched the nav's brand
text, identical everywhere. Scoped to the hero container, the numbers separated
at once: 254px to 552px.

**Case 3 — the silent null.** A reachability probe reported the RSVP nav entry
absent in every configuration. It was present throughout: the locator read
`<a href>` when the nav renders `<button onClick>`, and later `getByRole`
failed to match a button whose accessible name is not its label. A locator that
matches NOTHING and a locator that matches an ABSENT CONTROL return the same
value — and "nothing there" is exactly an answer that requires no explanation.
Four wrong readings, each of which looked like a product defect.

The tell is the ABSENCE OF VARIANCE where variance was the whole question, or
the absence of anything at all where something was expected. Ask what would
have to be true for the result to be real, and check that instead of the
result.

**The generalizable fix: an instrument must prove it can see a POSITIVE before
its negatives are believed.** The probe now asserts it can find a page it knows
is enabled, and reports itself blind rather than reporting the product broken.

**Case 4 — exit 0 from an instrument pointed at the wrong thing.** The first
effect test of the payments freeze edited the WORKING TREE while the check
compares COMMITS. It reported exit 0, and the reading very nearly taken was
"the guard is broken" rather than "the test is". An exit 0 from an instrument
aimed at the wrong target is the most expensive zero there is: it certifies
whatever you were hoping for.

**Case 5 — the regex that read half the array, and the near-miss.** Checking
whether `slug` was in the studio's autosave payload, a regex parsed
`const WRITABLE_FIELDS = [...]` and reported **"slug included: False"**. It had
read the literal entries and missed `...Object.keys(DEFAULT)`, where `slug`
actually lives. The answer was clean, plausible, and exactly what would have
ended the investigation — **and it was nearly accepted before a second check**.
The finding underneath was the most serious defect in that branch. An
instrument that reads part of a structure reports confidently about the part it
read.

---

## When a default sits next to a control the user can turn, it must hold across that control's RANGE

The overlay default was first validated at its own default size — 30% — where
18% down cleared every layout by 11px. But the couple was also shipped a SIZE
DIAL, and the mark grows from its centre: at roughly 49% width it would have
reached the text on the tightest layout.

**A default verified only at its starting value is not verified**, because the
control is part of the system and the user will turn it. 14% was chosen not
because 18% failed but because 14% has headroom: 45px of clearance, and the
mark can be scaled to about 76% before it reaches anything.

Eleven pixels of margin that survives no adjustment is a trap with a pass mark
on it.

---

## When measurement and reasoning disagree, BOTH are suspects

This file has said *measure, do not assert* all session, and that was right five
times in one day. The transport fixture is the counter-case, and the two belong
together.

**The static reading predicted `theme.lightText` on `theme.darkBg` would fail
4.5:1 on all 20 palettes. The first measurement showed zero failures.** The
measurement was wrong: the harness seed wrote `note.body` where the page reads
`note.text`, so the text never rendered and the guard could not see the defect
it was pointed at. A fixture that does not match the shape under test measures
nothing and reports it as clean.

Same day, the same shape from the other direction: the contrast guard treated a
translucent background as opaque, so `rgba(255,255,255,0.04)` over a near-black
page read as WHITE and scored real, readable text at **1:1**. Acting on that
would have "fixed" a page that was never broken. **A guard producing work
rather than safety is a guard that is wrong**, and it looks exactly like a
guard that is right.

**The complete instruction, with "presence before properties" above:**

> Measure rather than assert. And when a measurement contradicts a
> well-founded prediction, **investigate the instrument before revising the
> belief.**

### And a well-founded claim from a trusted source is still a claim

Later the same day, the advisor diagnosed a coverage hole: the US-English guard
said "dashboard/universe-builder source", so guest-facing copy looked unchecked.
The terminal accepted it and **began implementing the fix**.

Measured: `SCOPE_PATTERNS` is `src/pages`, `src/components`, `src/lib`, and the
only exclusions are the marketing tree and generated files.
**`src/components/guest-website/` had been in scope the whole time.** A planted
`"favourite"` in a guest page was caught, exit 1, named by file and line.

The wording was stale, not the scope — and it produced a wrong diagnosis in the
advisor and a wrong implementation start in the terminal. *(That wording is now
fixed, because a tool that misdescribes itself produces wrong conclusions in
everyone who reads it, however carefully they read.)*

**The protocol's value is that the terminal can refuse the advisor. It only
works if that is used on confident rulings as readily as on uncertain ones.**
A ruling arrives with authority; it does not arrive with evidence. Ask for the
evidence, or go and get it, before building on it — the same standard applied
to one's own claims all session.

Neither side is automatically the truth. The way through both cases was
refusing to accept either answer until they agreed.

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
