# conductor-obsidian (Obsidian plugin)

## Repo layout (easy to get wrong)

- This repo is developed from inside an Obsidian vault under `.../.obsidian/plugins/conductor-obsidian/` (see `README.md`). Run commands from the plugin directory, not the vault root.
- Source entrypoint: `src/main.ts` (bundled by `esbuild.config.mjs` to `main.js` at repo root).

## Dev + build

- Install: `npm install`
- Dev watch (writes `main.js` with inline sourcemap): `npm run dev`
- Production build (typecheck then minified bundle): `npm run build`
- Manual test loop in Obsidian: after changes, run Obsidian command "Reload app without saving".

## Lint

- ESLint uses legacy `.eslintrc` and `eslint` is not in `devDependencies`.
- Plain `npx eslint ...` will fetch ESLint v10 (Node 20+ + flat config) and fail.
- If you need linting, install ESLint v8 locally once: `npm i -D eslint@8.57.0`, then run `npx eslint "src/**/*.ts"`.

## Release wiring (tags drive releases)

- GitHub Actions `.github/workflows/release.yml` runs on any pushed tag, builds, then creates a GitHub Release and uploads `main.js`, `manifest.json`, `styles.css`.
- Tag name must equal `manifest.json`'s `version` (no leading `v`). `.npmrc` sets `tag-version-prefix=""`.
- `./publish.zsh [major|minor|patch]` bumps `manifest.json` and can optionally commit, tag, and push. It requires `jq`.
- `npm run version` updates `manifest.json` and `versions.json` from `package.json`'s version (via `version-bump.mjs`). In this repo `package.json` version and `manifest.json` version are currently not aligned, so running this will overwrite `manifest.json`'s version.

## Vault content assumptions (not in this repo)

- Project/task detection is driven by frontmatter `categories` containing `[[Project]]` / `[[Task]]` (see `src/utilities.ts`). If you change category strings, filtering breaks.
- New tasks are created from `_templates/Task.md` (and any other template names used by code) via `createFileFromTemplate`; this template must exist in the vault.
- Tasks/projects are expected under `Projects/Personal/...` and `Projects/Work/...`.

## Local artifacts

- `main.js` and `data.json` are runtime artifacts and are ignored by git (`.gitignore`); releases are produced by CI from tags.
