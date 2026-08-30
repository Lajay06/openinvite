#!/usr/bin/env bash
# Usage: ./scripts/ship.sh "your commit message"
# Builds, commits all staged+unstaged changes, pushes the current branch,
# and opens a GitHub PR for review.
# Never call this on main — use it on a feature/fix branch only.

set -e

MSG="${1:-}"

if [[ -z "$MSG" ]]; then
  echo "Usage: ./scripts/ship.sh \"your commit message\""
  exit 1
fi

BRANCH=$(git branch --show-current)

if [[ "$BRANCH" == "main" ]]; then
  echo "✗ You're on main. Never ship directly to main."
  echo "  Create a feature branch first: ./scripts/new-feature.sh <name>"
  exit 1
fi

echo ""
echo "Branch: ${BRANCH}"
echo ""

# ── 1. Full verify ────────────────────────────────────────────
# Gates on `npm run verify`, NOT `npm run build` alone.
#
# Why: this script used to push whenever the build compiled. It shipped a PR
# with a FAILING test:ci — the suite was red, the build was green, and the
# script pushed anyway. That is the green-suite-over-exit-code failure turned
# into tooling: the gate reported on the wrong signal, so the human had to
# notice. A ship script must refuse exactly when CI would.
#
# `npm run verify` runs every step ci.yml runs (build, lint, and the whole
# test suite), reporting diff-based steps as SKIPPED rather than PASS. It is
# the local mirror of pr:green.
echo "→ Running npm run verify (build + lint + full test suite)…"
if ! npm run verify; then
  echo ""
  echo "✗ verify failed. Fix it before shipping — CI will fail on the same thing."
  echo "  (This gate is deliberately the full suite: a green build is not a green PR.)"
  exit 1
fi
echo "✓ verify passed."
echo ""

# ── 2. Stage and commit ───────────────────────────────────────
echo "→ Staging all changes…"
git add -A

# ── WHAT IS ABOUT TO BE COMMITTED ────────────────────────────────────────────
# `git add -A` stages the WORKING TREE, not the change you have in mind, and
# uncommitted work follows a branch switch. On 2026-08-30 that carried a held
# /api/places consolidation into a PR about error-message passthrough: eight
# files landed where three were authorized, and the PR body said the
# consolidation was "held" while containing it.
#
# This prints, it does not refuse. Refusing a dirty tree is new-feature.sh's
# job and travels separately, because it can block and this cannot. The whole
# value is that eight files appear where you expected three.
echo ""
echo "  ── files in this commit ──────────────────────────────────────"
git diff --cached --name-status | sed 's/^/    /'
echo "    ───────────────────────────────────────────────────────────"
echo "    $(git diff --cached --name-only | wc -l | tr -d ' ') file(s). If that is not what you meant to ship, stop now."
echo ""

if git diff --cached --quiet; then
  echo "  (nothing new to commit — skipping commit step)"
else
  git commit -m "${MSG}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  echo "✓ Committed: ${MSG}"
fi
echo ""

# ── 3. Push branch ────────────────────────────────────────────
echo "→ Pushing ${BRANCH} to origin…"
git push origin "${BRANCH}"
echo "✓ Pushed."
echo ""

# ── 4. Open PR ────────────────────────────────────────────────
echo "→ Opening PR…"
# gh pr create's --title must be single-line — use only the first line of
# MSG for the title (gh errors "Title is too long" otherwise on multi-line
# commit messages); the full MSG still becomes the commit body above.
TITLE=$(printf '%s' "${MSG}" | head -n 1)
PR_URL=$(gh pr create \
  --base main \
  --head "${BRANCH}" \
  --title "${TITLE}" \
  --body "## Summary

<!-- What does this change and why? -->

## Test plan

- [ ] Verified in Vercel preview deployment
- [ ] npm run build passes
- [ ] No regressions in affected pages

🤖 PR opened via scripts/ship.sh" \
  2>&1 | tail -1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ PR open: ${PR_URL}"
echo ""
echo "Next:"
echo "  1. Visit the PR — Vercel will post a preview URL within ~60 s"
echo "  2. Open the preview and test the change"
echo "  3. Merge the PR on GitHub when happy"
echo "  4. Production (openinvite.com.au) updates automatically on merge"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  PR opened but NOT merged."
echo "   This work is NOT live yet."
echo ""
echo "   RULE: merge or close this PR before ending the session."
echo "   An open PR = work that silently never ships."
echo ""
echo "   Done = merged to main AND verified on openinvite.com.au"
echo "   NOT done = build passes, NOT done = PR opened"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
