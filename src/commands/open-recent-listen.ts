import { App } from "obsidian";
import { showRecentListenPicker } from "../choose-recent-listen-modal";
import { getReleaseFromFile } from "../music-release";

export const openRecentListen = async (app: App): Promise<void> => {
	const listen = await showRecentListenPicker(app);
	if (!listen) return;
	const release = getReleaseFromFile(app, listen);
	if (!release) return;
	await app.workspace.getLeaf(false).openFile(release);
};
