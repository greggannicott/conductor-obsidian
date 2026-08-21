# conductor-obsidian (Obsidian plugin)

## Repo layout (easy to get wrong)

- This repo is developed from inside an Obsidian vault under `.../.obsidian/plugins/conductor-obsidian/` (see `README.md`). Run commands from the plugin directory, not the vault root.
- Source entrypoint: `src/main.ts` (bundled by `esbuild.config.mjs` to `main.js` at repo root).

## Dev + build

- Install: `npm install`
- Dev watch (writes `main.js` with inline sourcemap): `npm run dev`
- Production build (typecheck then minified bundle): `npm run build`
- Manual test: Developer handles testing, so make code changes and let him know it is ready to test.

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
- Topic notes are detected via frontmatter `tags` containing `topic`; notes are linked to topics via a frontmatter `topics` property containing wikilinks to topic notes (see `src/topics.ts`). A note can have zero or more topics.

## Seeding test data from the real PKM

- Paths: real PKM is `/Users/greggannicott/pkm`; test playground vault is `/Users/greggannicott/code/playgrounds/obsidian-playground` (this plugin repo sits inside it).
- Journal notes live at the PKM root with timestamped names like `2026-08-21 1200 - title.md`. Frontmatter: `categories: ["[[Journal]]"]`, optional `tags`, and `topics:` holding wikilinks to topic notes (~584 as of Aug 2026).
- Wikilink targets from those notes (topics, plus `[[Journal]]` itself) may sit anywhere in the PKM: usually root, but also `Projects/Personal/...` or `References/...`. Resolve them by basename, not path.
- To seed N journals into the playground root:
  1. Find candidates: PKM-root `.md` files (skip `_`-prefixed) whose frontmatter `categories` contains `[[Journal]]`.
  2. Randomly sample N using a fixed seed so the selection is reproducible; prefer samples where some topics repeat (useful for testing topic grouping).
  3. Copy each verbatim into the playground root, overwriting on name clash.
  4. Collect every wikilink target from the sampled notes' frontmatter plus `Journal.md`; locate each `<name>.md` anywhere in the PKM and copy it flat into the playground root so all links resolve. Note some targets are project notes (`categories: [[Project]]`) and will appear in project views too.
- Gotchas: filenames contain spaces/apostrophes/unicode — don't loop over them unquoted in bash; use a `python3` heredoc (`os.walk` + `shutil.copy2`) and exclude `.obsidian/`.

## Local artifacts

- `main.js` and `data.json` are runtime artifacts and are ignored by git (`.gitignore`); releases are produced by CI from tags.
