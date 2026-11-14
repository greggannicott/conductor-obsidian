#!/bin/zsh

# Usage: ./publish.zsh [major|minor|patch] [options]
# Example: ./publish.zsh minor
#          ./publish.zsh --dry-run
# Defaults to patch if no level is specified.
#
# Non-interactive by design: every step runs without prompting.
# Use --no-* flags to opt out of a step.

set -uo pipefail

LEVEL="patch"
COMMIT=true
TAG=true
PUSH=true
DRY_RUN=false

print_help() {
  cat <<'EOF'
Usage: ./publish.zsh [major|minor|patch] [options]

Version level (positional, optional, defaults to patch):
  major | minor | patch

Options:
  --commit / --no-commit   Create a git commit with the version bump (default: commit)
  --tag / --no-tag         Create an annotated git tag for the new version (default: tag)
  --push / --no-push       Push the tag (and commit) to origin (default: push)
  -y, --yes                Accepted for compatibility; steps run by default
  --dry-run                Print the planned actions without changing anything
  -h, --help               Show this help and exit
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    major|minor|patch)
      LEVEL="$1"; shift ;;
    --commit) COMMIT=true; shift ;;
    --no-commit) COMMIT=false; shift ;;
    --tag) TAG=true; shift ;;
    --no-tag) TAG=false; shift ;;
    --push) PUSH=true; shift ;;
    --no-push) PUSH=false; shift ;;
    -y|--yes) shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) print_help; exit 0 ;;
    *)
      echo "Error: Unknown argument: $1" >&2
      print_help >&2
      exit 1 ;;
  esac
done

if [[ ! "$LEVEL" =~ ^(major|minor|patch)$ ]]; then
  echo "Error: Invalid version level. Must be 'major', 'minor', or 'patch'" >&2
  exit 1
fi

MANIFEST_FILE="manifest.json"

if [ ! -f "$MANIFEST_FILE" ]; then
  echo "Error: manifest.json not found" >&2
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install jq to use this script." >&2
  exit 1
fi

CURRENT_VERSION=$(jq -r '.version' "$MANIFEST_FILE")
echo "Current version: $CURRENT_VERSION"

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$LEVEL" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "New version: $NEW_VERSION"

if $TAG && ! $COMMIT; then
  echo "Note: --tag with --no-commit will tag the current HEAD." >&2
fi
# (PUSH always pushes the current branch; the tag is pushed too when TAG is set.)

if $DRY_RUN; then
  echo ""
  echo "Dry run - no changes made."
  echo "Planned actions:"
  echo "  - Bump manifest.json version: $CURRENT_VERSION -> $NEW_VERSION"
  if $COMMIT; then echo "  - git add manifest.json && git commit -m \"chore: Version number bump\""; fi
  if $TAG; then echo "  - git tag -a $NEW_VERSION -m \"$NEW_VERSION\" (if not existing)"; fi
  if $PUSH; then
    echo "  - git push origin HEAD"
    if $TAG; then echo "  - git push origin $NEW_VERSION"; fi
  fi
  exit 0
fi

# Update manifest.json using jq
jq --arg version "$NEW_VERSION" '.version = $version' "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp" && mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
echo "Successfully updated version in manifest.json to $NEW_VERSION"

if $COMMIT; then
  git add "$MANIFEST_FILE"
  if git diff --cached --quiet; then
    echo "No staged changes to commit; skipping commit."
  else
    git commit -m "chore: Version number bump"
    echo "Changes committed to git"
  fi
fi

if $TAG; then
  existing_version=$(git tag | grep "^${NEW_VERSION}$" || true)
  if [[ -n $existing_version ]]; then
    echo "Tag for version $NEW_VERSION already exists. Skipping tag creation." >&2
  else
    git tag -a "$NEW_VERSION" -m "$NEW_VERSION"
    echo "Tag $NEW_VERSION created"
  fi
fi

if $PUSH; then
  git push origin HEAD
  echo "Pushed current branch to origin"
  if $TAG; then
    git push origin "$NEW_VERSION"
    echo "Tag $NEW_VERSION pushed"
  fi
fi

echo "Done."
