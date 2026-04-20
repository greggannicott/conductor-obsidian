#!/bin/zsh

# Usage: ./publish.zsh [major|minor|patch]
# Example: ./publish.zsh minor
# Defaults to patch if no level is specified

if [ $# -eq 0 ]; then
  LEVEL="patch"
  echo "No version level specified, defaulting to patch"
else
  LEVEL=$1
fi

if [[ ! "$LEVEL" =~ ^(major|minor|patch)$ ]]; then
  echo "Error: Invalid version level. Must be 'major', 'minor', or 'patch'"
  exit 1
fi

MANIFEST_FILE="manifest.json"

if [ ! -f "$MANIFEST_FILE" ]; then
  echo "Error: manifest.json not found"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install jq to use this script."
  exit 1
fi

# Get current version
CURRENT_VERSION=$(jq -r '.version' "$MANIFEST_FILE")
echo "Current version: $CURRENT_VERSION"

# Split version into components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment based on level
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

# Update manifest.json using jq
jq --arg version "$NEW_VERSION" '.version = $version' "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp" && mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"

echo "Successfully updated version in manifest.json to $NEW_VERSION"

# Prompt for git commit
echo ""
read "response?Commit changes to git? (y/n): "

if [[ "$response" =~ ^[Yy]$ ]]; then
  git add "$MANIFEST_FILE"
  git commit -m "chore: Version number bump"
  echo "Changes committed to git"
  
  # Prompt for creating tag and pushing
  echo ""
  read "tag_response?Create new tag and push changes? (y/n): "
  
  if [[ "$tag_response" =~ ^[Yy]$ ]]; then
    version=$(cat manifest.json | jq -r '.version')
    existing_version=$(git tag | grep "^${version}$")
    if [[ -n $existing_version ]]; then
      echo "Tag for version number already exists. Increment version in manifest.json"
    else
      git tag -a $version -m "$version" && git push origin $version
      echo "Tag $version created and pushed"
    fi
  else
    echo "Skipping tag creation and push"
  fi
else
  echo "Skipping git commit and subsequent pushlish steps"
fi
