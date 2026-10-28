import { App } from "obsidian";
import { getReleaseSummary, isActiveFileMusicRelease } from "src/music-release";
import { copyToClipboard } from "src/utilities";

// Copies the active release as "{artists} - {title}", matching the text offered
// for the clipboard at the end of recording a listen.
export const copyArtistAndReleaseName = async (app: App): Promise<void> => {
	if (!isActiveFileMusicRelease(app)) return;
	const file = app.workspace.activeEditor?.file;
	if (!file) return;
	await copyToClipboard(getReleaseSummary(app, file));
};
