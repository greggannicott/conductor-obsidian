import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import {
	MUSIC_RELEASE_TITLE_MAX_LENGTH,
	compareReleasesByTitle,
	getMusicReleaseArtistGrouping,
	getMusicReleaseSearchFields,
	getMusicReleases,
	getMusicReleasesInRotation,
	getRateableRelease,
	getReleaseCover,
	getReleaseInRotation,
	getReleaseMeta,
	getReleaseRatingStars,
	getReleaseTitle,
} from "src/music-release";

export const showAddToRotation = async (app: App): Promise<void> => {
	const releases = getMusicReleases(app);
	if (releases.length === 0) {
		new Notice("No music releases found");
		return;
	}

	let initialValue: string | undefined;
	const activeFile = app.workspace.activeEditor?.file;
	if (activeFile) {
		const release = getRateableRelease(app, activeFile);
		if (release) initialValue = getReleaseTitle(app, release);
	}

	const selected = await ConductorSelectorModal.show(app, {
		items: releases,
		placeholder: "Select a music release to add to rotation...",
		initialValue,
		getText: (file) => getReleaseTitle(app, file),
			titleMaxLength: MUSIC_RELEASE_TITLE_MAX_LENGTH,
		getSearchTexts: (file) => getMusicReleaseSearchFields(app, file),
		getCover: (file) => getReleaseCover(app, file),
		getMeta: (file) => getReleaseMeta(app, file),
		getTitleRightMeta: (file) => getReleaseRatingStars(app, file),
		sortItems: (a, b) => compareReleasesByTitle(app, a, b),
		groupings: [getMusicReleaseArtistGrouping(app)],
	});
	if (!selected) return;
	await showRemoveFromRotation(app, selected);
};

// Adds a specific release to rotation: picks the release to remove (one in,
// one out), then swaps. Used directly by the file context menu.
export async function showRemoveFromRotation(
	app: App,
	added: TFile,
): Promise<void> {
	const addedTitle = getReleaseTitle(app, added);
	if (getReleaseInRotation(app, added)) {
		new Notice(`"${addedTitle}" is already in rotation`);
		return;
	}

	const inRotation = getMusicReleasesInRotation(app);
	if (inRotation.length === 0) {
		new Notice("No releases are currently in rotation");
		return;
	}

	const removed = await ConductorSelectorModal.show(app, {
		items: inRotation,
		placeholder: "Select a release to remove from rotation...",
		getText: (file) => getReleaseTitle(app, file),
			titleMaxLength: MUSIC_RELEASE_TITLE_MAX_LENGTH,
		getCover: (file) => getReleaseCover(app, file),
		getMeta: (file) => getReleaseMeta(app, file),
		getTitleRightMeta: (file) => getReleaseRatingStars(app, file),
		getSearchTexts: (file) => getMusicReleaseSearchFields(app, file),
		sortItems: (a, b) => compareReleasesByTitle(app, a, b),
	});
	if (!removed) return;

	await addToRotation(app, added, removed);
}

export async function addToRotation(
	app: App,
	added: TFile,
	removed: TFile,
): Promise<void> {
	await app.fileManager.processFrontMatter(added, (fm) => {
		fm["in-rotation"] = true;
	});
	await app.fileManager.processFrontMatter(removed, (fm) => {
		fm["in-rotation"] = false;
	});
	new Notice(
		`"${getReleaseTitle(app, added)}" is in rotation; "${getReleaseTitle(app, removed)}" is out`,
	);
}