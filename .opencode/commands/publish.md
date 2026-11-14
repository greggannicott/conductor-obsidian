---
description: Publish a new version of the Conductor plugin (bump manifest, commit, tag, push).
---

You are publishing the Conductor Obsidian plugin from the current repository.

The working directory must be the plugin repo: `/Users/greggannicott/code/playgrounds/obsidian-playground/.obsidian/plugins/conductor-obsidian`.

Steps:
1. Confirm the version level with the user if not provided in `$ARGUMENTS`. Accept `major`, `minor`, or `patch` (default `patch`). Also accept optional flags such as `--no-push`, `--no-tag`, `--no-commit`, `--dry-run`.
2. Run `./publish.zsh $ARGUMENTS` (the script is non-interactive).
3. Report the resulting version and the actions taken. If a dry run was requested, do not modify any files beyond what the script does.
4. Do not run `npm run build` unless the user asks; CI builds on tag push.

If the user asks for a dry run, pass `--dry-run` and report the planned actions without making changes.
