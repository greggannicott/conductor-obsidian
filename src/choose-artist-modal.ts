import { App, TFile } from "obsidian";
import type { ConductorSelectorOptions } from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	ARTIST_TITLE_MAX_LENGTH,
	compareArtistsByTitle,
	getArtistCover,
	getArtists,
	getArtistMeta,
	getArtistSearchFields,
	getArtistTitle,
} from "./artists";

// The standard artist picker: all artists ungrouped, with cover art, search
// across aliases and groups, and a meta line stating whether the artist is a
// band or a musician. Callers override items, placeholder, initialValue or any
// other option via `overrides`.
export function showArtistPicker(
	app: App,
	overrides: Partial<ConductorSelectorOptions<TFile>> = {},
): Promise<TFile | null> {
	return ConductorSelectorModal.show(app, {
		items: getArtists(app),
		placeholder: "Select an artist...",
		getText: (file) => getArtistTitle(app, file),
		titleMaxLength: ARTIST_TITLE_MAX_LENGTH,
		getSearchTexts: (file) => getArtistSearchFields(app, file),
		getCover: (file) => getArtistCover(app, file),
		getMeta: (file) => getArtistMeta(app, file),
		sortItems: (a, b) => compareArtistsByTitle(app, a, b),
		...overrides,
	});
}