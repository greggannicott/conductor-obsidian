import { App } from "obsidian";
import { showMusicReleasePicker } from "../choose-music-release-modal";

export const openMusicRelease = async (app: App): Promise<void> => {
	const release = await showMusicReleasePicker(app);
	if (!release) return;
	await app.workspace.getLeaf(false).openFile(release);
};