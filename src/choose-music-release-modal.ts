import { App, TFile } from "obsidian";
import type { ConductorSelectorOptions } from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	MUSIC_RELEASE_TITLE_MAX_LENGTH,
	compareReleasesByTitle,
	getMusicReleaseArtistGrouping,
	getMusicReleaseSearchFields,
	getMusicReleases,
	getReleaseCover,
	getReleaseMeta,
	getReleaseRatingStars,
	getReleaseTitle,
} from "./music-release";

// The standard music release picker: all releases grouped by artist, with cover
// art, meta and rating. Callers override items, placeholder, initialValue or
// any other option via `overrides`.
export function showMusicReleasePicker(
	app: App,
	overrides: Partial<ConductorSelectorOptions<TFile>> = {},
): Promise<TFile | null> {
	return ConductorSelectorModal.show(app, {
		items: getMusicReleases(app),
		placeholder: "Select a music release...",
		getText: (file) => getReleaseTitle(app, file),
		titleMaxLength: MUSIC_RELEASE_TITLE_MAX_LENGTH,
		getSearchTexts: (file) => getMusicReleaseSearchFields(app, file),
		getCover: (file) => getReleaseCover(app, file),
		getMeta: (file) => getReleaseMeta(app, file),
		getTitleRightMeta: (file) => getReleaseRatingStars(app, file),
		sortItems: (a, b) => compareReleasesByTitle(app, a, b),
		groupings: [getMusicReleaseArtistGrouping(app)],
		rankGroupsByRelevance: true,
		...overrides,
	});
}