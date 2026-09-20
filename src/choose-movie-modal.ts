import { App, TFile } from "obsidian";
import type { ConductorSelectorOptions } from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	MOVIE_TITLE_MAX_LENGTH,
	compareMoviesByTitle,
	getMovieCover,
	getMovieMeta,
	getMovieRatingStars,
	getMovieSearchFields,
	getMovies,
	getMovieTitle,
} from "./movie";

// The standard movie picker: all movies ungrouped, with cover art, meta
// (year, duration, watched) and a rating on the right. Callers override items,
// placeholder, initialValue or any other option via `overrides`.
export function showMoviePicker(
	app: App,
	overrides: Partial<ConductorSelectorOptions<TFile>> = {},
): Promise<TFile | null> {
	return ConductorSelectorModal.show(app, {
		items: getMovies(app),
		placeholder: "Select a movie...",
		getText: (file) => getMovieTitle(app, file),
		titleMaxLength: MOVIE_TITLE_MAX_LENGTH,
		getSearchTexts: (file) => getMovieSearchFields(app, file),
		getCover: (file) => getMovieCover(app, file),
		getMeta: (file) => getMovieMeta(app, file),
		getTitleRightMeta: (file) => getMovieRatingStars(app, file),
		sortItems: (a, b) => compareMoviesByTitle(app, a, b),
		...overrides,
	});
}