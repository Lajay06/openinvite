# Development workflow — Openinvite

## The rules

**Never commit or push directly to `main`.**  
`main` = production = openinvite.com.au. It must always be deployable.  
Every change goes through a feature branch → PR → Vercel preview → merge.

**Every PR must be merged or closed in the same session it is opened.**  
Never leave a session with an open PR. An open PR is work that has not shipped — it is easy to forget, and it creates stacking conflicts when new work starts on top of an unmerged base. If a PR genuinely can't merge yet, say so explicitly and decide what to do before moving on.

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

## Branch protection (GitHub)

`main` has branch protection enabled:
- PR required before merging (no direct pushes)
- Vercel deployment check must pass before merging (optional but recommended)

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
