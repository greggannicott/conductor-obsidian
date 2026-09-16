import { App, TFile, parseFrontMatterStringArray } from "obsidian";
import { getFilesWithCategory } from "./utilities";

export function getReleaseTitle(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const title = frontmatter?.title;
	return typeof title === "string" && title.trim()
		? title.trim()
		: file.basename;
}

export function getArtists(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const artists = frontmatter?.artists;
	if (!Array.isArray(artists)) return "";
	return artists
		.map((artist) => String(artist).replace(/^\[\[|\]\]$/g, "").trim())
		.filter(Boolean)
		.join(", ");
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

// All music releases in the vault, sorted by title (then basename as a tiebreaker).
export function getMusicReleases(app: App): TFile[] {
	const releases = getFilesWithCategory(app, "Music Release");
	releases.sort((a, b) => {
		const titleComparison = getReleaseTitle(app, a).localeCompare(
			getReleaseTitle(app, b),
		);
		return titleComparison !== 0
			? titleComparison
			: a.basename.localeCompare(b.basename);
	});
	return releases;
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