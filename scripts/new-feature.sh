#!/usr/bin/env bash
# Usage: ./scripts/new-feature.sh <name>
# Creates and checks out a new branch from the latest main.
# Examples:
#   ./scripts/new-feature.sh marketplace-search-fix   → feat/marketplace-search-fix
#   ./scripts/new-feature.sh fix-accommodation-reload → fix/fix-accommodation-reload
# If the name starts with fix- or fix/, the branch prefix is fix/; otherwise feat/.

set -e

NAME="${1:-}"

if [[ -z "$NAME" ]]; then
  echo "Usage: ./scripts/new-feature.sh <branch-name>"
  echo "  e.g. ./scripts/new-feature.sh marketplace-search-fix"
  exit 1
fi

# Choose prefix: fix/ if name starts with fix, else feat/
if [[ "$NAME" == fix-* || "$NAME" == fix/* ]]; then
  SLUG="${NAME#fix-}"
  SLUG="${SLUG#fix/}"
  BRANCH="fix/${SLUG}"
else
  BRANCH="feat/${NAME}"
fi

echo ""
echo "→ Switching to main and pulling latest…"
git checkout main
git pull origin main

echo "→ Creating branch: ${BRANCH}"
git checkout -b "${BRANCH}"

echo ""
echo "✓ You're now on branch: ${BRANCH}"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. Run: npm run build   (must pass before committing)"
echo "  3. Ship: ./scripts/ship.sh \"your commit message\""
echo ""
