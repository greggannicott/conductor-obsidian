import { App, TFile, parseFrontMatterStringArray } from "obsidian";
import type { ConductorSelectorMeta } from "src/conductor-selector-modal";
import {
	getFilesWithCategory,
	getLinkedNames,
	getLinkedNamesAsTitles,
	getNoteTitle,
} from "./utilities";

// Display truncation length for artist names in pickers.
export const ARTIST_TITLE_MAX_LENGTH = 120;

// The artist's name, preferring the note's `title` over its basename.
export function getArtistTitle(app: App, file: TFile): string {
	return getNoteTitle(app, file);
}

export function compareArtistsByTitle(app: App, a: TFile, b: TFile): number {
	const titleComparison = getArtistTitle(app, a).localeCompare(
		getArtistTitle(app, b),
	);
	return titleComparison !== 0
		? titleComparison
		: a.basename.localeCompare(b.basename);
}

// All artists in the vault, sorted by title (then basename as a tiebreaker).
export function getArtists(app: App): TFile[] {
	const artists = getFilesWithCategory(app, "Artist");
	artists.sort((a, b) => compareArtistsByTitle(app, a, b));
	return artists;
}

export function getArtistAliases(app: App, file: TFile): string[] {
	return getLinkedNames(app, file, "aliases");
}

// Groups/collectives the artist belongs to (e.g. Lou Reed's "The Velvet
// Underground").
export function getArtistGroups(app: App, file: TFile): string[] {
	return getLinkedNames(app, file, "groups");
}

// Search fields for the picker: the artist name, each alias and each group are
// matched independently, so a query must be satisfied within a single field
// rather than spanning across them. Groups contribute both their display name
// and the name as written in frontmatter.
export function getArtistSearchFields(app: App, file: TFile): string[] {
	return [
		...new Set([
			getArtistTitle(app, file),
			...getArtistAliases(app, file),
			...getArtistGroups(app, file),
			...getLinkedNamesAsTitles(app, file, "groups"),
		]),
	].filter(Boolean);
}

export function getArtistCover(app: App, file: TFile): string | null {
	const cover = app.metadataCache.getFileCache(file)?.frontmatter?.cover;
	if (typeof cover !== "string" || !cover.trim()) return null;
	const value = cover.trim();
	if (/^https?:\/\//i.test(value)) return value;
	// Local image referred to by a wikilink (e.g. "[[Artist.jpg]]"), resolved
	// relative to the note and served as a vault resource so the picker can
	// render it.
	const wikilink = value.match(/^\[\[([^\]]+)\]\]$/);
	if (wikilink) {
		const name = wikilink[1].split("|")[0].trim();
		const target = app.metadataCache.getFirstLinkpathDest(name, file.path);
		if (target) return app.vault.getResourcePath(target);
	}
	return null;
}

// Whether the artist is a band or a musician, from the frontmatter type field
// (e.g. "[[Band]]", "[[Musician]]").
export function getArtistTypes(app: App, file: TFile): string[] {
	const types = parseFrontMatterStringArray(
		app.metadataCache.getFileCache(file)?.frontmatter,
		"type",
	);
	if (!types) return [];
	return [
		...new Set(
			types
				.map((type) => type.replace(/^\[\[|\]\]$/g, "").trim())
				.filter(Boolean),
		),
	];
}

// Meta line for an artist picker row: whether the artist is a band or a
// musician. Absent when the artist's type is unknown.
export function getArtistMeta(app: App, file: TFile): ConductorSelectorMeta[] {
	return getArtistTypes(app, file).map((type) => ({ value: type }));
}