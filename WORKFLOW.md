# Development workflow — Openinvite

## The rules

**Never commit or push directly to `main`.**  
`main` = production = openinvite.com.au. It must always be deployable.  
Every change goes through a feature branch → PR → Vercel preview → merge.

**Every PR must be merged or closed in the same session it is opened.**  
Never leave a session with an open PR. An open PR is work that has not shipped — it is easy to forget, and it creates stacking conflicts when new work starts on top of an unmerged base. If a PR genuinely can't merge yet, say so explicitly and decide what to do before moving on.

**No stacked PRs.**  
Squash-merge deletes the base branch and GitHub closes the dependent PR rather than retargeting it. Sequence conflicting changes as separate PRs replayed onto `main` after the first lands.  
Measured 2026-09-27: #864 was based on #862's branch and was closed, unmerged, the moment #862 landed — and a closed PR's base cannot be changed. Because the parent was squashed, the orphaned branch no longer shared a merge base with `main`, so a fresh PR from it showed the parent's files re-applied (7 files became 17). It had to be replayed onto `main` as #865.

**`npm run verify` still does not cover the browser lane, and now it says so.**  
It derives its steps from `ci.yml` and excludes anything that needs a live preview server, which is the whole browser lane: 48 guards a green verify says nothing about. A change to shared chrome, anything under `src/components/layout/` or imported by `DashboardPageHeader`, needs those guards run before the PR, not after CI fails.  
Measured 2026-09-29 on #872: `verify` was green and CI failed on `test:ava-page-modal`, because one import inside the shared page header put `avaOpen` into every page's import graph.  
**With the split, run the shard, not the loop.** It is one command each, the same one CI runs:

```bash
npm run test:shard-a      # 27 guards, about 15m35s
npm run test:shard-b      # 21 guards, about 15m37s
npm run test:shard-a -- --list   # what is in it, and what each one cost
```

`npm run verify` prints both lines at the end of its own run, so the lane is named rather than silently missing. The shard lists, ports and measured seconds live in `.github/browser-shards.json`; rebalancing is an edit to that file, not to the workflow. Each guard's full output is written to `browser-shard-logs/`, which CI uploads as an artifact when a shard fails.

**"Done" means merged to main AND verified on openinvite.com.au.**  
Not "build passes." Not "PR opened." Not "Vercel preview looks good." Done = on main = live.

**Start every session with `gh pr list`.**  
If any PRs are open from a previous session, surface them immediately before starting new work.

---

## Starting new work

```bash
./scripts/new-feature.sh <name>
```

Examples:

```bash
./scripts/new-feature.sh marketplace-search-fix     # → feat/marketplace-search-fix
./scripts/new-feature.sh fix-accommodation-reload   # → fix/fix-accommodation-reload
```

The script:
1. Checks out `main` and pulls latest
2. Creates and checks out `feat/<name>` or `fix/<name>`
3. Prints next-step instructions

---

## Shipping a change

```bash
./scripts/ship.sh "your commit message"
```

The script:
1. **Runs `npm run build` and aborts if it fails** — broken code never gets shipped
2. Stages all changes and commits with your message
3. Pushes the branch to origin
4. Opens a GitHub PR (`gh pr create`) with a template body
5. Prints the PR URL and reminds you to check the Vercel preview

---

## Merge authorization, and what `pr:green` means

A merge authorization is valid only if it carries **all five marks** (DECISION-LOG,
R38, 2026-09-07): the PR number, the full 40-character head SHA, the file list,
the gate stated in words, and the fact that it is written as an authorization.
A line missing any of them is not a line, and the response is to stop, quote it
back and ask.

**The gate, in words, is now four checks, not two.** The browser lane was split
out of `Build & test` on 2026-09-30, so `pr:green` means:

| check | what it covers |
| --- | --- |
| `Build & test` | install, build, lint, the persistence suite, the diff guards, the prerender guards |
| `Browser guards A` | 27 of the 48 browser guards, balanced by measured time |
| `Browser guards B` | the other 21 |
| `Vercel Preview Comments` | and `Vercel` where present |

`npm run pr:merge <n>` runs `scripts/pr-checks-green.mjs`, which requires all of
those to be PRESENT and SUCCESS: absence is not success, and SKIPPED and NEUTRAL
are not either. Before the split one name covered the whole lane; a gate that
still asked about one would call a PR green with 48 guards red or missing.

**The GitHub ruleset is a separate thing and it is owner-only.** It decides what
may merge; `pr-checks-green.mjs` decides what this repository's own tooling will
call green. Both have to name the three CI checks, and only one of them is
changed by editing a file.

---

## Vercel preview deployments

Every branch pushed to GitHub gets its own preview URL from Vercel automatically (Vercel Pro).  
The preview URL appears as a comment on the PR within ~60 seconds of the push.

- **Preview** → tests your branch in isolation, no prod risk
- **Production** (openinvite.com.au) → only updates when a PR is **merged into main**

You should always open the preview URL and verify the change before merging.

---

## Full cycle example

```bash
# 0. Start of session — always check for leftover open PRs first
gh pr list   # if anything is open, resolve it before starting new work

# 1. Start work
./scripts/new-feature.sh marketplace-search-fix

# 2. Make changes, then verify the build still passes
npm run build

# 3. Ship: build check + commit + push + open PR
./scripts/ship.sh "fix: Marketplace search uses Text Search with user query as core term"

# 4. Copy the Vercel preview URL from the PR comment, open it, test the feature

# 5. Merge on GitHub — production deploys automatically

# 6. Verify on openinvite.com.au — THIS is done. Not before.
#    Do not open the next task until this PR is merged and confirmed live.
```

---

## Branch naming

| Prefix | When to use |
|---|---|
| `feat/` | New features or enhancements |
| `fix/` | Bug fixes |
| `style/` | Visual/layout changes, no logic change |
| `chore/` | Tooling, docs, deps, config |

---

## Pre-push hooks — installed by `npm install`, not by memory

`.githooks/pre-push` gates every push on four checks: the payments freeze,
the credential-file check, the canon-on-a-branch check, and lint.

Git does not use `.githooks/` unless `core.hooksPath` points at it, and that
setting is **local config — it is not version-controlled and does not survive
a fresh clone**. It used to depend on someone remembering to run the command,
which is the same shape as every other failure it exists to prevent. The
`prepare` script in `package.json` now sets it automatically on `npm install`
and `npm ci`, so a new clone is protected as soon as its dependencies are.

If you ever see `prepare: could not set core.hooksPath` during an install, the
hooks are NOT active in that checkout — CI still runs the same checks, but
nothing will stop a bad push locally.

`--no-verify` skips the hooks entirely. That is why the payments and credential
checks also run in CI, where they cannot be skipped.

---

## Branch protection (GitHub)

`main` has branch protection enabled:
- PR required before merging (no direct pushes)
- Vercel deployment check must pass before merging (optional but recommended)
- **Three CI checks must pass, not one.** The browser lane was split out of
  `Build & test` on 2026-09-30, so the required set is `Build & test`,
  `Browser guards A` and `Browser guards B`. A ruleset that still named only
  the first would let a PR merge with 48 guards red or absent. Adding or
  removing a required check is done by the owner in GitHub settings;
  `scripts/pr-checks-green.mjs` names the same three, and that half is a file.
- CI / Build & test check (`.github/workflows/ci.yml`) must pass before merging —
  install, build, lint, the credential-free subset of the persistence suite
  (`npm run test:ci`, see `scripts/test-ci.mjs`), and the marketing-routes smoke test
  (against this build's own local preview, not production), so a red PR can never be
  merged silently. The live, credential-requiring persistence suite
  (`npm run test:persistence`) is deliberately NOT part of CI — `BASE44_ADMIN_KEY` is
  full production database access and does not live in GitHub secrets, and every
  PR/push run hitting the live production database would risk colliding with a local
  test run. It stays a required LOCAL pre-merge step, same standing as the
  marketing-routes test above.

To update protection rules: GitHub repo → Settings → Branches → main → Edit.

---

## Emergency hotfix

If production is broken and you need to fix it fast:

```bash
./scripts/new-feature.sh fix-critical-thing
# ... fix ...
./scripts/ship.sh "fix: critical thing"
# Review the preview, then merge immediately
```

Even hotfixes go through a PR. The PR review + merge takes ~2 minutes total.

---

## Persistence test

After any change that adds or edits a Base44 entity field, run:

```bash
npm run test:persistence
```

**What it checks:** Creates a throwaway `WeddingDetails` sentinel record under the test
account, writes dummy values to all 7 Guest Suite fields, re-reads fresh from Base44,
and asserts each value round-trips correctly. Prints `✅ PASS` / `❌ FAIL` per field.
Exits 0 if all pass, 1 if any fail (CI-ready).

**Requires:** `BASE44_TEST_EMAIL` and `BASE44_TEST_PASSWORD` in `.env.local`  
(dedicated test account `jaygalaxy23@gmail.com` — credentials in `.env.local`, gitignored).

**Run it when you:**
- Add a new Guest Suite data field
- Change a field name anywhere in the Guest Suite → Base44 pipeline
- Update the WeddingDetails schema on Base44
- Are unsure whether a field is actually persisting

**The bug it catches:** Base44 silently drops any field not registered in the entity
schema. The test writes → reads → asserts so a dropped field shows up as `❌ FAIL`
instead of looking like it saved but disappearing on reload.

---

## Marketing-routes smoke test

Before merging **any** change that touches a marketing/public page (`src/pages/Home.jsx`,
`Features.jsx`, `Ava.jsx`, `Universes.jsx`, `Pricing.jsx`, `About.jsx`, `Contact.jsx`, the
legal pages, auth pages, or any shared component they import), run:

```bash
npm run test:marketing-routes
```

**What it checks:** Loads every public marketing/auth route in a real browser (Playwright)
and fails if the page renders the root Sentry error boundary ("Something went wrong.") or
throws an uncaught exception during render. Prints `✓`/`✗` per route. Exits 0 if all pass,
1 if any fail (CI-ready).

**Requires:** nothing by default — points at production (`https://openinvite.com.au`) same
as the capture pipeline. To test a branch before it's live, point it at a local dev server
or the PR's own Vercel preview instead, via the same env var the capture pipeline uses:

```bash
CAPTURE_BASE_URL=http://localhost:5173 npm run test:marketing-routes
CAPTURE_BASE_URL=https://openinvite-git-my-branch-lajay06.vercel.app npm run test:marketing-routes
```

**Run it when you:**
- Change anything on a marketing/public page or a component it imports
- Add a new section/component to the marketing site
- Are about to merge a marketing-site PR at all — this is now a required pre-merge step,
  same standing as the persistence test above

**The bug it catches:** A component referenced in JSX but never imported (or any other
render-time `ReferenceError`/`TypeError`) does not fail `npm run build` — Vite only
resolves `import` statements at build time, not whether every JSX tag name is actually in
scope. This exact bug shipped to production once already (`Ava.jsx` used
`ProductMediaFrame`/`ProductVideo` without importing them; the build stayed green, and the
live page showed nothing but the generic error boundary until someone opened it manually).
This test opens every route the same way a visitor would and catches that class of crash
before merge, not after.

---

## What Claude Code sessions should do

Claude always works on a feature branch, never on `main`.  
See `CLAUDE.md` for standing instructions to all AI sessions on this project.

## Two standing rules the owner added on 2026-10-07

Both came out of real damage in one session, so each records what went wrong
rather than only what to do.

### Never run a guard listed in LIVE_CREDENTIAL_GUARDS

**Before running any guard not named in the brief, read
`tests/persistence/_registry.mjs`, and never run one listed in
`LIVE_CREDENTIAL_GUARDS`.**

Those guards sign people up, send mail and write rows to the live Base44
database. `npm run test:ci` never runs them, by design: that list is the reason
the CI lane is safe to run from anywhere.

What went wrong: a session hunting for the right guard ran
`tests/persistence/todo-list-schema.mjs` by name. It is in the live set
(registry line 82) and it creates and deletes real `Note` records. Nothing was
written that time, only because `.env.local` held no `BASE44_ADMIN_KEY` and the
create failed. The protection was an absent credential, not a decision.

Reading the registry first costs one command. Running a live guard by accident
costs production rows.

### Test the merge in a worktree before opening an overlapping PR

**Before opening any PR that touches a file another open PR also touches, do
the merge in a scratch worktree and state in the PR body whether it was
clean.**

What went wrong: #902 and #903 both touched `src/pages/Guests.jsx`. Two PR
bodies and a status report all said the overlap was "in different regions" and
that git "should merge them". Both had added their own `import ... from
'@/lib/household'` at the same position, so the merge conflicted. GitHub only
said so after #902 had landed, which is the worst moment to find out.

The second problem it exposed is subtler and worth knowing on its own:

> GitHub builds a `pull_request` run from `refs/pull/N/merge`, the base merged
> with the head. When a conflict appears that ref **cannot be recomputed**, so
> it keeps pointing at a merge into the OLD base. Re-running the workflow then
> re-tests the stale tree and reports a green that looks entirely valid.

So a green verdict is only evidence about the tree that will actually land if
the run **started after** the new base existed, and the merge ref names that
base. Both are checkable:

```bash
git fetch -f origin refs/pull/<n>/merge:refs/remotes/origin/pr<n>m
git log --oneline -1 refs/remotes/origin/pr<n>m   # "Merge <head> into <base>"
gh api repos/<owner>/<repo>/actions/runs/<id> --jq '.created_at'
```

The worktree test itself is three commands and leaves nothing behind:

```bash
git worktree add -q --detach /tmp/wt origin/main
cd /tmp/wt && git merge --no-commit --no-ff origin/<the-other-branch>
git diff --name-only --diff-filter=U        # the conflicted paths, if any
cd - && git worktree remove --force /tmp/wt
```
