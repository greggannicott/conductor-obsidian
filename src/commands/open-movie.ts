import { App } from "obsidian";
import { showMoviePicker } from "../choose-movie-modal";

export const openMovie = async (app: App): Promise<void> => {
	const movie = await showMoviePicker(app);
	if (!movie) return;
	await app.workspace.getLeaf(false).openFile(movie);
};