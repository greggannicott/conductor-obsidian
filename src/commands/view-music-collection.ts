import { App, Notice } from "obsidian";

export const viewMusicCollection = async (app: App): Promise<void> => {
	const file = app.vault.getFiles().find((f) => f.name === "Music Releases.base");
	if (!file) {
		new Notice("Music Releases.base not found");
		return;
	}
	await app.workspace.getLeaf(false).openFile(file);
};
