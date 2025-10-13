# conductor-obsidian

Although this repo is public, it's actually for a private Obsidian plugin I use to manage projets in Obsidian. It is very much geared towards how I work in Obsidian.

# Development

## Location of Repo

This plugin is developed in a slightly different way to how I'd typically manage my repos.

It is developed in a Obsidian Vault known as "obsidian-playground". The repo of this plugin is cloned into the `/.obsidian/plugins/` directory and worked on there.

[BRAT](https://tfthacker.com/BRAT) is then used to import it into the Vaults I wish to use the plugin in.

## Running and Manual Testing

Run the plugin with:

```zsh
npm run dev
```

Following any changes to the repo, inside of the "obsidian-playground" Vault run the command "Reload app without saving".

## Debugging

The Developer Console can be opened in Obsidian and `console.log` statements are written to it.

## Releasing New Version

- Incremement the version number in `manifest.json`.
- Commit change of version number:

```zsh
git add manifest.json && git commit -m "chore: Version number bump"
```

- Create and push a new tag (which matches the version number in the `manifest.json`):

```zsh
version=$(cat manifest.json | jq -r '.version')
existing_version=$(git tag | grep "^${version}$")
if [[ -n $existing_version ]];
then
	echo "Tag for version number already. Increment version in manifest.json"
else
	git tag -a $version -m "$version" && git push origin $version
fi
```

This will create a new release in GitHub.

Shortly afterwards BRAT (the GitHub plugin used to manage beta releases) will detect a new version and will update it.

Notes:

- If you aren't prepared to wait for BRAT, run the Obsidian command "BRAT: Check for updates for all beta plugins and update".
- There should be no need to run "Reload app without saving" for the updated plugin functionality to work once BRAT has performed its update.
