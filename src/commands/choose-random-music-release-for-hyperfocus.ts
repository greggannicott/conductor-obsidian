import { App, Notice, TFile } from "obsidian";
import { getMusicReleases, getReleaseSummary } from "src/music-release";
import { isForFocusing } from "./for-focusing";

export const chooseRandomMusicReleaseForHyperfocus = async (
	app: App,
): Promise<void> => {
	const releases = getMusicReleases(app).filter((file) =>
		isForFocusing(app, file),
	);
	if (releases.length === 0) {
		new Notice("No music releases marked for focusing");
		return;
	}

	const file = releases[Math.floor(Math.random() * releases.length)];
	await app.workspace.getLeaf(false).openFile(file);
	new Notice(
		`Chose ${getReleaseSummary(app, file)} for hyperfocus`,
	);
};
