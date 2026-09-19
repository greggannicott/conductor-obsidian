import { App, Notice, TFile } from "obsidian";
import { showMusicReleasePicker } from "../choose-music-release-modal";
import {
	getMusicReleases,
	getMusicReleasesInRotation,
	getRateableRelease,
	getReleaseInRotation,
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

	const selected = await showMusicReleasePicker(app, { initialValue });
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

	const removed = await showMusicReleasePicker(app, {
		items: inRotation,
		placeholder: "Select a release to remove from rotation...",
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