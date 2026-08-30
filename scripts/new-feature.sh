#!/usr/bin/env bash
# Usage: ./scripts/new-feature.sh <name> [--carry]
# Creates and checks out a new branch from the latest main.
#
# --carry  deliberately bring uncommitted work onto the new branch. Announces
#          every file it carries. Without it, a dirty tree is refused.
# Examples:
#   ./scripts/new-feature.sh marketplace-search-fix   → feat/marketplace-search-fix
#   ./scripts/new-feature.sh fix-accommodation-reload → fix/fix-accommodation-reload
# If the name starts with fix- or fix/, the branch prefix is fix/; otherwise feat/.

set -e

NAME=""
CARRY=0
for arg in "$@"; do
  case "$arg" in
    --carry) CARRY=1 ;;
    *)       [[ -z "$NAME" ]] && NAME="$arg" ;;
  esac
done

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

# ── REFUSE A DIRTY TREE ──────────────────────────────────────────────────────
#
# UNCOMMITTED WORK FOLLOWS A CHECKOUT. That is the whole defect, and it is the
# fourth instance of one shape: work left loose in the workspace gets swept up
# by the next routine command. The stash-switch-pop took an unrelated branch's
# WIP; `git add -A` took a session storage-state and an RSVP token; and on
# 2026-08-30 a held /api/places consolidation rode this very checkout into a PR
# about error-message passthrough, where `ship.sh`'s `git add -A` committed it
# and eight files merged under a line describing three.
#
# Refusing here removes the situation rather than asking anyone to remember.
#
# NO OVERRIDE FLAG, DELIBERATELY. This script is a convenience wrapper; anyone
# who genuinely wants to carry changes onto a new branch can still run
# `git checkout -b <name>` directly. An escape hatch already exists outside the
# script, so adding one inside it would only make the refusal ignorable — and
# the value of an override is its rarity.
if [[ -n "$(git status --porcelain)" ]]; then
  echo ""
  echo "  REFUSING: the working tree is not clean."
  echo ""
  echo "  These changes would FOLLOW you onto ${BRANCH} and be committed there"
  echo "  by ship.sh, which stages everything:"
  echo ""
  git status --porcelain | sed 's/^/    /'
  echo ""
  echo "  Commit them where they belong, or move them deliberately:"
  echo "    git add <paths> && git commit -m \"…\"   # if they belong on this branch"
  echo "    git stash push -m \"<name>\" -- <paths>   # by name; never a bare pop"
  echo ""
  echo "  For a docs-only commit to main, use the docs worktree instead:"
  echo "    cd ../openinvite-docs && git pull && … && git push origin HEAD:main"
  echo ""
  echo "  If you MEANT to bring this work onto ${BRANCH}, say so:"
  echo "    ./scripts/new-feature.sh ${NAME} --carry"
  echo ""
  exit 1
fi

# ── --carry: the deliberate case, made BETTER than the workaround ────────────
#
# A guard with no way through does not remove the situation, it pushes the
# situation onto a worse path. Without this flag the answer to a refusal is
# `git checkout -b`, which carries the work AND skips the pull — so you branch
# from stale main, and nothing announces either fact.
#
# So the sanctioned route is not merely permitted, it is the BEST route:
# it bases the branch on a freshly fetched origin/main, and it NAMES every file
# it carried. An override that leaves no trace cannot be audited, and this one
# is used at exactly the moment scope is at risk.
#
# `checkout -b <branch> origin/main` reaches a fresh base while keeping the
# working tree — no stash, no pop, none of the manoeuvre canon warns about.
# Git still refuses if the carried files would be clobbered by the checkout,
# which is the one case where stopping is correct.
if [[ "$CARRY" == "1" && -n "$(git status --porcelain)" ]]; then
  echo ""
  echo "  ── CARRYING UNCOMMITTED WORK onto ${BRANCH} ──────────────────"
  git status --porcelain | sed 's/^/    /'
  echo "    ───────────────────────────────────────────────────────────"
  echo "    $(git status --porcelain | wc -l | tr -d ' ') file(s) carried, deliberately, via --carry."
  echo ""
  echo "→ Fetching latest origin/main…"
  git fetch origin main
  echo "→ Creating branch ${BRANCH} from origin/main, keeping your changes…"
  git checkout -b "${BRANCH}" origin/main
else
  echo ""
  echo "→ Switching to main and pulling latest…"
  git checkout main
  git pull origin main

  echo "→ Creating branch: ${BRANCH}"
  git checkout -b "${BRANCH}"
fi

echo ""
echo "✓ You're now on branch: ${BRANCH}"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. Run: npm run build   (must pass before committing)"
echo "  3. Ship: ./scripts/ship.sh \"your commit message\""
echo ""
