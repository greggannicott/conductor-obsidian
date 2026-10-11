import { App, TFile } from "obsidian";
import type { ConductorSelectorOptions } from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	MUSIC_RELEASE_TITLE_MAX_LENGTH,
	getListenDayGrouping,
	getMusicReleaseSearchFields,
	getRecentListens,
	getReleaseCover,
	getReleaseFromFile,
	getReleaseMeta,
	getReleaseRatingStars,
	getReleaseTitle,
} from "./music-release";

// The release each listen points at. getRecentListens guarantees a resolvable
// release, but the lookups are typed to cope with one going missing.
function releaseFor(app: App, listen: TFile): TFile | null {
	return getReleaseFromFile(app, listen);
}

// The recent-listens picker: the last RECENT_LISTEN_LIMIT listens, newest
// first, grouped by day. Rows present the release the listen was of (cover,
// meta, rating) using the standard music selector presentation.
export function recentListenPickerOptions(
	app: App,
	overrides: Partial<ConductorSelectorOptions<TFile>> = {},
): ConductorSelectorOptions<TFile> {
	return {
		items: getRecentListens(app),
		placeholder: "Select a recent listen...",
		getText: (listen) => {
			const release = releaseFor(app, listen);
			return release ? getReleaseTitle(app, release) : listen.basename;
		},
		titleMaxLength: MUSIC_RELEASE_TITLE_MAX_LENGTH,
		getSearchTexts: (listen) => {
			const release = releaseFor(app, listen);
			return release ? getMusicReleaseSearchFields(app, release) : [];
		},
		getCover: (listen) => {
			const release = releaseFor(app, listen);
			return release ? getReleaseCover(app, release) : null;
		},
		getMeta: (listen) => {
			const release = releaseFor(app, listen);
			return release ? getReleaseMeta(app, release) : null;
		},
		getTitleRightMeta: (listen) => {
			const release = releaseFor(app, listen);
			return release ? getReleaseRatingStars(app, release) : null;
		},
		groupings: [getListenDayGrouping(app)],
		...overrides,
	};
}

export function showRecentListenPicker(
	app: App,
	overrides: Partial<ConductorSelectorOptions<TFile>> = {},
): Promise<TFile | null> {
	return ConductorSelectorModal.show(
		app,
		recentListenPickerOptions(app, overrides),
	);
}
