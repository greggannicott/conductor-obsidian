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
