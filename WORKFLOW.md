# Development workflow — Openinvite

## The rule

**Never commit or push directly to `main`.**  
`main` = production = openinvite.com.au. It must always be deployable.  
Every change goes through a feature branch → PR → Vercel preview → merge.

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
# 1. Start work
./scripts/new-feature.sh marketplace-search-fix

# 2. Make changes, then verify the build still passes
npm run build

# 3. Ship: build check + commit + push + open PR
./scripts/ship.sh "fix: Marketplace search uses Text Search with user query as core term"

# 4. Copy the Vercel preview URL from the PR comment, open it, test the feature

# 5. Merge on GitHub — production deploys automatically
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

## What Claude Code sessions should do

Claude always works on a feature branch, never on `main`.  
See `CLAUDE.md` for standing instructions to all AI sessions on this project.
