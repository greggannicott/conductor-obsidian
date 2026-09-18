import { App, TFile, parseFrontMatterStringArray } from "obsidian";
import type { ConductorSelectorGrouping } from "src/conductor-selector-modal";
import {
	getFilesWithCategory,
	isFileCategory,
	isFileType,
} from "./utilities";

export function getReleaseTitle(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const title = frontmatter?.title;
	return typeof title === "string" && title.trim()
		? title.trim()
		: file.basename;
}

export function getArtistNames(app: App, file: TFile): string[] {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const artists = frontmatter?.artists;
	if (!Array.isArray(artists)) return [];
	return artists
		.map((artist) => String(artist).replace(/^\[\[|\]\]$/g, "").trim())
		.filter(Boolean);
}

export function getArtists(app: App, file: TFile): string {
	return getArtistNames(app, file).join(", ");
}

export function isActiveFileMusicRelease(app: App): boolean {
	const activeFile = app.workspace.activeEditor?.file;
	if (!activeFile) return false;
	const metadata = app.metadataCache.getFileCache(activeFile);
	const categories = metadata?.frontmatter?.categories;
	return (
		categories &&
		Array.isArray(categories) &&
		categories.includes("[[Music Release]]")
	);
}

export function compareReleasesByTitle(app: App, a: TFile, b: TFile): number {
	const titleComparison = getReleaseTitle(app, a).localeCompare(
		getReleaseTitle(app, b),
	);
	return titleComparison !== 0
		? titleComparison
		: a.basename.localeCompare(b.basename);
}

// All music releases in the vault, sorted by title (then basename as a tiebreaker).
export function getMusicReleases(app: App): TFile[] {
	const releases = getFilesWithCategory(app, "Music Release");
	releases.sort((a, b) => compareReleasesByTitle(app, a, b));
	return releases;
}

// Search fields for the picker: the release title and its artists are matched
// independently, so a query must be satisfied within a single field.
export function getMusicReleaseSearchFields(app: App, file: TFile): string[] {
	return [getReleaseTitle(app, file), getArtists(app, file)].filter(Boolean);
}

// Grouping of releases under non-selectable artist headers. Releases with
// multiple artists appear under each artist; releases without a known artist
// fall under "Unknown Artist".
export function getMusicReleaseArtistGrouping(
	app: App,
): ConductorSelectorGrouping<TFile> {
	return {
		id: "artist",
		label: "Group by Artist",
		buildGroups: (releases) => {
			const buckets = new Map<string, TFile[]>();
			for (const release of releases) {
				const artists = getArtistNames(app, release);
				const names = artists.length > 0 ? artists : ["Unknown Artist"];
				for (const name of names) {
					if (!buckets.has(name)) buckets.set(name, []);
					buckets.get(name)!.push(release);
				}
			}
			return [...buckets.entries()]
				.sort(([artistA], [artistB]) => artistA.localeCompare(artistB))
				.map(([header, items]) => ({ header, items }));
		},
	};
}

// Formats associated with the release, normalized to wikilinks (e.g. "[[CD]]").
export function getFormats(app: App, file: TFile): string[] {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const formats = frontmatter?.formats;
	if (!Array.isArray(formats)) return [];
	return formats
		.map((format) => {
			const name = String(format).replace(/^\[\[|\]\]$/g, "").trim();
			return name ? `[[${name}]]` : "";
		})
		.filter(Boolean);
}

// Resolves a release name (with or without wikilink wrappers) to its TFile.
export function getReleaseFile(
	app: App,
	releaseName: string,
	sourcePath?: string,
): TFile | null {
	const cleanName = releaseName.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
	if (sourcePath) {
		const resolved = app.metadataCache.getFirstLinkpathDest(cleanName, sourcePath);
		if (resolved) return resolved;
	}
	return (
		getFilesWithCategory(app, "Music Release").find(
			(f) => f.basename === cleanName,
		) ?? null
	);
}

// The release name listed in a file's `music-release` frontmatter field. The
// field is normally a wikilink string but array form is tolerated too.
export function getLinkedReleaseName(app: App, file: TFile): string | null {
	const value =
		app.metadataCache.getFileCache(file)?.frontmatter?.["music-release"];
	const links = Array.isArray(value)
		? value.map(String)
		: typeof value === "string"
			? [value]
			: [];
	const link = links[0];
	if (!link) return null;
	const name = link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
	return name.length > 0 ? name : null;
}

// Resolves the Music Release a file refers to. A Music Release file is
// returned directly; any other file resolves via its `music-release` link.
export function getReleaseFromFile(app: App, file: TFile): TFile | null {
	if (isFileCategory(app, file, "Music Release")) return file;
	const releaseName = getLinkedReleaseName(app, file);
	return releaseName
		? getReleaseFile(app, releaseName, file.path)
		: null;
}

// Files a rating can be applied through: Music Releases directly, or Backlog
// Item / Consumption notes of type Listen that link to a release.
export function isRateableFile(app: App, file: TFile): boolean {
	return (
		isFileCategory(app, file, "Music Release") ||
		(isFileCategory(app, file, "Backlog Item") &&
			isFileType(app, file, "Listen")) ||
		(isFileCategory(app, file, "Consumption") &&
			isFileType(app, file, "Listen"))
	);
}

// The Music Release to rate for a file. Returns null when the file isn't
// rateable or its linked release can't be resolved.
export function getRateableRelease(app: App, file: TFile): TFile | null {
	if (!isRateableFile(app, file)) return null;
	return getReleaseFromFile(app, file);
}

export function getReleaseRating(app: App, file: TFile): number | null {
	const rating = app.metadataCache.getFileCache(file)?.frontmatter?.rating;
	return typeof rating === "number" ? rating : null;
}

export function getReleaseInRotation(app: App, file: TFile): boolean {
	return (
		app.metadataCache.getFileCache(file)?.frontmatter?.["in-rotation"] === true
	);
}

// Music Releases currently marked as in rotation, sorted by title.
export function getMusicReleasesInRotation(app: App): TFile[] {
	return getMusicReleases(app).filter((file) => getReleaseInRotation(app, file));
}

// Date-times of every listen recorded for the release, newest first. Each value
// is the raw "date-time" frontmatter string (e.g. "2026-09-16 16:07:15").
export function getListenDatesForRelease(
	app: App,
	releaseName: string,
): string[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => {
			if (file.path.startsWith("_templates/")) return false;
			const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
			const categories = parseFrontMatterStringArray(
				frontmatter,
				"categories",
			);
			if (!categories?.includes("[[Consumption]]")) return false;
			const types = parseFrontMatterStringArray(frontmatter, "type");
			if (!types?.includes("[[Listen]]")) return false;
			const musicRelease = parseFrontMatterStringArray(
				frontmatter,
				"music-release",
			);
			return musicRelease?.includes(`[[${releaseName}]]`) ?? false;
		})
		.map((file) => {
			const dateTime =
				app.metadataCache.getFileCache(file)?.frontmatter?.["date-time"];
			return typeof dateTime === "string" ? dateTime : "";
		})
		.filter(Boolean)
		.sort((a, b) => b.localeCompare(a));
}