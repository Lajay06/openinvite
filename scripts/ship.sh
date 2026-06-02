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

# ── 1. Build check ────────────────────────────────────────────
echo "→ Running npm run build…"
if ! npm run build --silent; then
  echo ""
  echo "✗ Build failed. Fix errors before shipping."
  exit 1
fi
echo "✓ Build passed."
echo ""

# ── 2. Stage and commit ───────────────────────────────────────
echo "→ Staging all changes…"
git add -A

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
PR_URL=$(gh pr create \
  --base main \
  --head "${BRANCH}" \
  --title "${MSG}" \
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
