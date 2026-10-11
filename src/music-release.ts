import { App, TFile, moment, parseFrontMatterStringArray } from "obsidian";
import type {
	ConductorSelectorGrouping,
	ConductorSelectorMeta,
} from "src/conductor-selector-modal";
import {
	getFilesWithCategory,
	getLinkedNames,
	getLinkedNamesAsTitles,
	getNoteTitle,
	isFileCategory,
	isFileType,
} from "./utilities";

// Display truncation length for release titles in pickers.
export const MUSIC_RELEASE_TITLE_MAX_LENGTH = 120;

// The release title, preferring the note's `title` over its basename.
export function getReleaseTitle(app: App, file: TFile): string {
	return getNoteTitle(app, file);
}

// The release's artists as display names: each `artists` entry is resolved to
// its artist note and rendered title-first, so the artist's `title` is shown
// rather than the file name that had to be made unique (e.g. "R.E.M." for the
// note "REM").
export function getArtistNames(app: App, file: TFile): string[] {
	return getLinkedNamesAsTitles(app, file, "artists");
}

// The release's artists as written in frontmatter (i.e. the artist notes' file
// names). Kept for search only, so a query matches either form.
export function getArtistLinkNames(app: App, file: TFile): string[] {
	return getLinkedNames(app, file, "artists");
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

// Search fields for the picker: the release title and each individual artist
// are matched independently, so a query must be satisfied within a single
// field rather than spanning across them. Artists contribute both their
// display name and the name as written in frontmatter, so searching "REM"
// still finds "R.E.M.".
export function getMusicReleaseSearchFields(app: App, file: TFile): string[] {
	return [
		...new Set([
			getReleaseTitle(app, file),
			...getArtistNames(app, file),
			...getArtistLinkNames(app, file),
		]),
	].filter(Boolean);
}

const GROUP_HEADER_MAX_LENGTH = 60;
const GROUP_HEADER_LEAD_ARTISTS = 3;

function truncateGroupHeader(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, Math.max(1, maxLength - 3)).trimEnd() + "...";
}

// A group heading listing a release's artists, e.g. "Gustav Mahler, BBC
// Scottish Symphony Orchestra, Edinburgh Festival Chorus +2 more", truncated to
// a sensible length.
function formatArtistGroupHeader(artists: string[]): string {
	if (artists.length === 1) return artists[0];
	const shown = artists.slice(0, GROUP_HEADER_LEAD_ARTISTS).join(", ");
	const tail =
		artists.length > GROUP_HEADER_LEAD_ARTISTS
			? ` +${artists.length - GROUP_HEADER_LEAD_ARTISTS} more`
			: "";
	if ((shown + tail).length <= GROUP_HEADER_MAX_LENGTH) return shown + tail;
	const budget = Math.max(1, GROUP_HEADER_MAX_LENGTH - tail.length);
	return truncateGroupHeader(shown, budget) + tail;
}

// Grouping of releases under a single non-selectable header per artist line-up.
// A release appears exactly once, under a header listing all of its artists
// (truncated, using their display titles); releases without a known artist fall
// under "Unknown Artist".
export function getMusicReleaseArtistGrouping(
	app: App,
): ConductorSelectorGrouping<TFile> {
	return {
		id: "artist",
		label: "Group by Artist",
		buildGroups: (releases) => {
			const buckets = new Map<string, TFile[]>();
			for (const release of releases) {
				const names = [...new Set(getArtistNames(app, release))];
				const key = names.length > 0 ? names.join(", ") : "Unknown Artist";
				if (!buckets.has(key)) buckets.set(key, []);
				buckets.get(key)!.push(release);
			}
			return [...buckets.entries()]
				.map(([key, items]) => ({
					header:
						key === "Unknown Artist"
							? key
							: formatArtistGroupHeader(key.split(", ")),
					items,
				}))
				.sort((a, b) => a.header.localeCompare(b.header));
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

export function getReleaseCover(app: App, file: TFile): string | null {
	const cover = app.metadataCache.getFileCache(file)?.frontmatter?.cover;
	return typeof cover === "string" && cover.trim() ? cover.trim() : null;
}

// Meta lines for a release picker row: artists (no label), then "Released
// <year>" and the run length when known. The rating lives on the title line
// via getReleaseRatingStars.
export function getReleaseMeta(app: App, file: TFile): ConductorSelectorMeta[] {
	const meta: ConductorSelectorMeta[] = [];
	const artists = getArtists(app, file);
	if (artists) meta.push({ value: artists });
	const year = getReleaseYear(app, file);
	if (year) meta.push({ label: "Released", value: String(year) });
	const duration = getReleaseDuration(app, file);
	if (duration) meta.push({ label: "Duration", value: duration });
	const listenCount = getReleaseListenCount(app, file);
	if (listenCount !== null) {
		meta.push({ value: `${listenCount} Listen${listenCount === 1 ? "" : "s"}` });
	}
	return meta;
}

// The number of times the release has been listened to, from frontmatter, or
// null when the release has never been listened to.
export function getReleaseListenCount(app: App, file: TFile): number | null {
	const listens = app.metadataCache.getFileCache(file)?.frontmatter?.listens;
	return typeof listens === "number" && listens > 0 ? listens : null;
}

// The release's rating rendered as stars, for the right-aligned slot on the
// title line. Null when the release is unrated.
export function getReleaseRatingStars(app: App, file: TFile): string | null {
	const rating = getReleaseRating(app, file);
	return rating && rating > 0 ? "★".repeat(rating) : null;
}

// The release year from frontmatter. Values are wikilinks (e.g. "[[2006]]");
// anything that isn't a four-digit year resolves to null.
export function getReleaseYear(app: App, file: TFile): number | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.year;
	if (raw === undefined || raw === null) return null;
	const digits = String(raw).replace(/^\[\[|\]\]$/g, "").trim();
	return /^\d{4}$/.test(digits) ? parseInt(digits, 10) : null;
}

// The release's run length from frontmatter, an HH:MM:SS value (e.g.
// "00:40:08"), rendered as "40m" / "1h 6m" / "1h". Null when missing or
// unparseable.
export function getReleaseDuration(app: App, file: TFile): string | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.duration;
	if (typeof raw !== "string") return null;
	const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(raw.trim());
	if (!match) return null;
	const hours = match[1] ? parseInt(match[1], 10) : 0;
	const minutes = parseInt(match[2], 10);
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
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

// Listen notes (from the listen note's "notes" frontmatter), if present.
export function getListenNotes(app: App, file: TFile): string | null {
	const notes =
		app.metadataCache.getFileCache(file)?.frontmatter?.notes;
	return typeof notes === "string" && notes.trim() ? notes.trim() : null;
}

// True for a listen note: a Consumption note of type Listen.
export function isListenFile(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	return (
		isFileCategory(app, file, "Consumption") &&
		isFileType(app, file, "Listen")
	);
}

// The moment a listen was recorded, from the note's "date-time" frontmatter
// (e.g. "2026-09-16 16:07:15").
export function getListenDateTime(app: App, file: TFile): string | null {
	const dateTime =
		app.metadataCache.getFileCache(file)?.frontmatter?.["date-time"];
	return typeof dateTime === "string" && dateTime.trim()
		? dateTime.trim()
		: null;
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
			if (!isListenFile(app, file)) return false;
			const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
			const musicRelease = parseFrontMatterStringArray(
				frontmatter,
				"music-release",
			);
			return musicRelease?.includes(`[[${releaseName}]]`) ?? false;
		})
		.map((file) => getListenDateTime(app, file) ?? "")
		.filter(Boolean)
		.sort((a, b) => b.localeCompare(a));
}

// How many listens the recent-listens picker lists.
export const RECENT_LISTEN_LIMIT = 20;

// The most recently recorded listens (a listen note whose release can still be
// resolved), newest first and capped at `limit`.
export function getRecentListens(
	app: App,
	limit: number = RECENT_LISTEN_LIMIT,
): TFile[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => isListenFile(app, file))
		.map((file) => ({ file, dateTime: getListenDateTime(app, file) }))
		.filter(
			(entry): entry is { file: TFile; dateTime: string } =>
				entry.dateTime !== null &&
				getReleaseFromFile(app, entry.file) !== null,
		)
		.sort((a, b) => b.dateTime.localeCompare(a.dateTime))
		.slice(0, limit)
		.map((entry) => entry.file);
}

// The day ("YYYY-MM-DD") a listen belongs to, from its recorded date-time.
function getListenDay(app: App, file: TFile): string | null {
	const dateTime = getListenDateTime(app, file);
	return dateTime ? dateTime.slice(0, 10) : null;
}

// A day heading for a group of listens, e.g. "Wednesday 16th September 2026".
// The weekday is spelled out so the day is recognisable at a glance.
function formatListenDayHeader(day: string): string {
	const parsed = moment(day, "YYYY-MM-DD");
	return parsed.isValid() ? parsed.format("dddd Do MMMM YYYY") : day;
}

// Grouping of recent listens under a header per calendar day. Items are
// expected newest-first, so days appear newest-first too.
export function getListenDayGrouping(app: App): ConductorSelectorGrouping<TFile> {
	return {
		id: "day",
		label: "Group by Day",
		buildGroups: (listens) => {
			const buckets = new Map<string, TFile[]>();
			for (const listen of listens) {
				const day = getListenDay(app, listen);
				if (!day) continue;
				if (!buckets.has(day)) buckets.set(day, []);
				buckets.get(day)!.push(listen);
			}
			return [...buckets.entries()].map(([day, items]) => ({
				header: formatListenDayHeader(day),
				items,
			}));
		},
	};
}