#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_NAME="${0:t}"
SCRIPT_DIR="${0:A:h}"
PLAYGROUND_ROOT="${SCRIPT_DIR:h:h:h}"
PKM_ROOT="${PKM_ROOT:-$HOME/pkm}"
PROTECTED_REL=".obsidian/plugins/conductor-obsidian"

DRY_RUN=0
APPLY=0

usage() {
  print -r -- "Usage: $SCRIPT_NAME [--dry-run | --apply]"
  print -r -- ""
  print -r -- "Copy $PKM_ROOT into the playground vault."
  print -r -- "The directory $PROTECTED_REL is protected from copying and deletion."
  print -r -- ""
  print -r -- "  --dry-run  Show the planned changes without modifying files"
  print -r -- "  --apply    Apply changes without asking for confirmation"
}

while (( $# > 0 )); do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --apply)
      APPLY=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      print -u2 -- "Unknown option: $1"
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if (( DRY_RUN && APPLY )); then
  print -u2 -- "--dry-run and --apply cannot be used together"
  exit 2
fi

if ! command -v rsync >/dev/null 2>&1; then
  print -u2 -- "rsync is required but was not found"
  exit 1
fi

if ! command -v realpath >/dev/null 2>&1; then
  print -u2 -- "realpath is required but was not found"
  exit 1
fi

if [[ ! -d "$PKM_ROOT" ]]; then
  print -u2 -- "Source directory does not exist: $PKM_ROOT"
  exit 1
fi

if [[ ! -d "$PLAYGROUND_ROOT" ]]; then
  print -u2 -- "Playground directory does not exist: $PLAYGROUND_ROOT"
  exit 1
fi

SOURCE_ROOT=$(realpath "$PKM_ROOT")
DESTINATION_ROOT=$(realpath "$PLAYGROUND_ROOT")
PROTECTED_PATH="$DESTINATION_ROOT/$PROTECTED_REL"

if [[ "$SOURCE_ROOT" == "$DESTINATION_ROOT" || "$SOURCE_ROOT" == "$DESTINATION_ROOT/"* || "$DESTINATION_ROOT" == "$SOURCE_ROOT/"* ]]; then
  print -u2 -- "Source and destination must be separate directories"
  exit 1
fi

if [[ ! -d "$PROTECTED_PATH" || ! -e "$PROTECTED_PATH/.git" ]]; then
  print -u2 -- "Protected plugin repository is missing or invalid: $PROTECTED_PATH"
  exit 1
fi

RSYNC_ARGS=(
  --archive
  --delete
  "--exclude=/$PROTECTED_REL/"
  --stats
)

if (( DRY_RUN )); then
  RSYNC_ARGS+=(--dry-run)
fi

print -r -- "Source:      $SOURCE_ROOT"
print -r -- "Destination: $DESTINATION_ROOT"
print -r -- "Protected:   $PROTECTED_PATH"
print -r -- ""

if (( ! DRY_RUN && ! APPLY )); then
  print -r -- "This will make the playground match the source and delete destination-only files."
  print -r -- "The protected plugin repository will not be changed."
  read "reply?Continue? [y/N] "
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    print -r -- "Cancelled"
    exit 0
  fi
elif (( DRY_RUN )); then
  print -r -- "Dry run: no files will be changed."
else
  print -r -- "Applying changes."
fi

rsync "${RSYNC_ARGS[@]}" "$SOURCE_ROOT/" "$DESTINATION_ROOT/"
