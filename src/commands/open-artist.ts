import { App } from "obsidian";
import { showArtistPicker } from "../choose-artist-modal";

export const openArtist = async (app: App): Promise<void> => {
	const artist = await showArtistPicker(app);
	if (!artist) return;
	await app.workspace.getLeaf(false).openFile(artist);
};