import { App, TFile } from "obsidian";
import type { ConductorSelectorMeta } from "src/conductor-selector-modal";
import { getFilesWithCategory } from "./utilities";

// Display truncation length for movie titles in pickers.
export const MOVIE_TITLE_MAX_LENGTH = 120;

export function getMovieTitle(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const title = frontmatter?.title;
	return typeof title === "string" && title.trim()
		? title.trim()
		: file.basename;
}

export function compareMoviesByTitle(app: App, a: TFile, b: TFile): number {
	const titleComparison = getMovieTitle(app, a).localeCompare(
		getMovieTitle(app, b),
	);
	return titleComparison !== 0
		? titleComparison
		: a.basename.localeCompare(b.basename);
}

// All movies in the vault, sorted by title (then basename as a tiebreaker).
export function getMovies(app: App): TFile[] {
	const movies = getFilesWithCategory(app, "Movie");
	movies.sort((a, b) => compareMoviesByTitle(app, a, b));
	return movies;
}

export function getDirectors(app: App, file: TFile): string[] {
	return getPeopleNames(app, file, "director");
}

export function getActors(app: App, file: TFile): string[] {
	return getPeopleNames(app, file, "actors");
}

function getPeopleNames(app: App, file: TFile, field: string): string[] {
	const value = app.metadataCache.getFileCache(file)?.frontmatter?.[field];
	if (!Array.isArray(value)) return [];
	return value
		.map((name) => String(name).replace(/^\[\[|\]\]$/g, "").trim())
		.filter(Boolean);
}

// Search fields for the picker: the movie title and each individual director
// and actor are matched independently, so a query must be satisfied within a
// single field rather than spanning across them.
export function getMovieSearchFields(app: App, file: TFile): string[] {
	return [
		getMovieTitle(app, file),
		...getDirectors(app, file),
		...getActors(app, file),
	].filter(Boolean);
}

export function getMovieCover(app: App, file: TFile): string | null {
	const cover = app.metadataCache.getFileCache(file)?.frontmatter?.cover;
	return typeof cover === "string" && cover.trim() ? cover.trim() : null;
}

export function getMovieRating(app: App, file: TFile): number | null {
	const rating = app.metadataCache.getFileCache(file)?.frontmatter?.rating;
	return typeof rating === "number" ? rating : null;
}

// The movie's rating rendered as stars, for the right-aligned slot on the
// title line. Null when the movie is unrated.
export function getMovieRatingStars(app: App, file: TFile): string | null {
	const rating = getMovieRating(app, file);
	return rating && rating > 0 ? "★".repeat(rating) : null;
}

// The movie year from frontmatter. Values are wikilinks (e.g. "[[2024]]");
// anything that isn't a four-digit year resolves to null.
export function getMovieYear(app: App, file: TFile): number | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.year;
	if (raw === undefined || raw === null) return null;
	const digits = String(raw).replace(/^\[\[|\]\]$/g, "").trim();
	return /^\d{4}$/.test(digits) ? parseInt(digits, 10) : null;
}

// Movie duration from frontmatter, an ISO 8601 duration (e.g. "PT2H10M",
// "PT18M", "PT2H"), rendered as "2h 10m". Null when missing or unparseable.
export function getMovieDuration(app: App, file: TFile): string | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.duration;
	if (typeof raw !== "string") return null;
	const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(raw.trim());
	if (!match) return null;
	const hours = match[1] ? parseInt(match[1], 10) : 0;
	const minutes = match[2] ? parseInt(match[2], 10) : 0;
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
}

export function isMovieWatched(app: App, file: TFile): boolean {
	return app.metadataCache.getFileCache(file)?.frontmatter?.watched === true;
}

// Meta lines for a movie picker row: year, duration and watched status. The
// rating lives on the title line via getMovieRatingStars.
export function getMovieMeta(app: App, file: TFile): ConductorSelectorMeta[] {
	const meta: ConductorSelectorMeta[] = [];
	const year = getMovieYear(app, file);
	if (year) meta.push({ label: "Year", value: String(year) });
	const duration = getMovieDuration(app, file);
	if (duration) meta.push({ label: "Duration", value: duration });
	meta.push({
		label: "Watched",
		value: isMovieWatched(app, file) ? "✓" : "✗",
	});
	return meta;
}