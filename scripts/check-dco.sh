#!/usr/bin/env sh
# Verify that every commit in a range carries a DCO sign-off.
#
# Usage:
#   ./scripts/check-dco.sh                 # commits on this branch vs the base ref
#   ./scripts/check-dco.sh main..HEAD      # an explicit revision range
#
# The sign-off must match the commit author, so a copied trailer from someone
# else does not satisfy the check.

set -eu

base="${DCO_BASE_REF:-origin/main}"
range="${1:-}"

if [ -z "$range" ]; then
  if git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
    range="$base..HEAD"
  elif git rev-parse --verify --quiet "HEAD~1^{commit}" >/dev/null; then
    range="HEAD~1..HEAD"
  else
    range="HEAD"
  fi
fi

if ! git rev-list --no-merges "$range" >/dev/null 2>&1; then
  echo "Cannot resolve revision range '$range'." >&2
  exit 1
fi

# Commits that predate the DCO policy.
#
# The initial commit was authored before sign-off was required, so it cannot
# satisfy a rule that did not exist yet. Exempting it explicitly is preferable
# to rewriting published history; if the repository has never been pushed,
# `git rebase --signoff --root` is the cleaner fix and this list can then be
# emptied.
DCO_EXEMPT_COMMITS="${DCO_EXEMPT_COMMITS:-c82858c7c7a482e52ac3176fd124c36973ac9a22}"

failures=0
count=0
exempt=0

for sha in $(git rev-list --no-merges "$range"); do
  case " $DCO_EXEMPT_COMMITS " in
    *" $sha "*)
      exempt=$((exempt + 1))
      continue
      ;;
  esac
  count=$((count + 1))
  author_name=$(git show -s --format='%an' "$sha")
  author_email=$(git show -s --format='%ae' "$sha")
  body=$(git show -s --format='%B' "$sha")

  if ! printf '%s\n' "$body" | grep -qi '^Signed-off-by:'; then
    echo "MISSING sign-off: $sha  ($author_name <$author_email>)"
    failures=$((failures + 1))
    continue
  fi

  # A sign-off must belong to the commit author, not to anyone else.
  if ! printf '%s\n' "$body" | grep -i '^Signed-off-by:' | grep -Fqi "<$author_email>"; then
    echo "MISMATCHED sign-off: $sha"
    echo "  author: $author_name <$author_email>"
    printf '%s\n' "$body" | grep -i '^Signed-off-by:' | sed 's/^/  found:  /'
    failures=$((failures + 1))
  fi
done

if [ "$count" -eq 0 ]; then
  echo "No non-merge commits in '$range' requiring a sign-off; nothing to check."
  [ "$exempt" -gt 0 ] && echo "($exempt exempt by policy.)"
  exit 0
fi

if [ "$failures" -gt 0 ]; then
  echo
  echo "$failures of $count commit(s) in '$range' are missing a valid DCO sign-off."
  echo "  amend the last commit:  git commit --amend -s"
  echo "  re-sign a whole branch: git rebase --signoff $base"
  exit 1
fi

echo "All $count commit(s) in '$range' are signed off."
[ "$exempt" -gt 0 ] && echo "($exempt commit(s) exempt by policy.)"

exit 0
