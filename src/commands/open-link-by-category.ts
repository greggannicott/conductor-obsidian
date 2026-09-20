import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { buildCategoryNoteSelector } from "src/category-config";
import { showMusicReleasePicker } from "../choose-music-release-modal";
import { showMoviePicker } from "../choose-movie-modal";
import { getAllCategories, getFilesWithCategory } from "src/utilities";

// Runs a note picker and opens the chosen file, if any.
const openWithPicker = async (
	app: App,
	pick: (app: App) => Promise<TFile | null>,
): Promise<void> => {
	const file = await pick(app);
	if (!file) return;
	await app.workspace.getLeaf(false).openFile(file);
};

export const openNoteByCategory = async (app: App): Promise<void> => {
	const categories = getAllCategories(app);
	if (categories.length === 0) {
		new Notice("No categories found");
		return;
	}

	const category = await ConductorSelectorModal.show(app, {
		items: categories,
		placeholder: "Select a category...",
		emptyText: "No categories found",
		getText: (cat) => cat,
		sortItems: (a, b) => a.localeCompare(b),
	});
	if (!category) return;

	if (category === "Music Release") {
		await openWithPicker(app, showMusicReleasePicker);
		return;
	}

	if (category === "Movie") {
		await openWithPicker(app, showMoviePicker);
		return;
	}

	const files = getFilesWithCategory(app, category);
	if (files.length === 0) {
		new Notice(`No notes found for category "${category}"`);
		return;
	}

	const currentFile = app.workspace.activeEditor?.file;
	const selectorOptions = buildCategoryNoteSelector(
		app,
		category,
		files,
		currentFile,
	);
	const file = await ConductorSelectorModal.show(app, selectorOptions);
	if (!file) return;

	await app.workspace.getLeaf(false).openFile(file);
};
