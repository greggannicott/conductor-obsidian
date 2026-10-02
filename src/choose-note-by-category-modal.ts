import { App, Notice, TFile } from "obsidian";
import {
	ConductorSelectorModal,
	ConductorSelectorOptions,
} from "./conductor-selector-modal";
import { buildCategoryNoteSelector } from "./category-config";
import { artistPickerOptions } from "./choose-artist-modal";
import { moviePickerOptions } from "./choose-movie-modal";
import { musicReleasePickerOptions } from "./choose-music-release-modal";
import { projectSelectorOptions } from "./choose-project-modal";
import { getProjects } from "./projects";
import { getAllCategories, getFilesWithCategory } from "./utilities";

// A note chosen from a category, paired with the text its picker displayed it
// by - a release's title, a project's jira-prefixed name, or a journal note's
// title. Callers that build a link reuse the label rather than re-deriving it.
export type SelectedNote = {
	file: TFile;
	label: string;
};

// Shows a selector and pairs the chosen item with the text it was displayed by,
// so the caller doesn't have to know how that picker renders its items.
async function pickWithLabel<T>(
	app: App,
	options: ConductorSelectorOptions<T>,
): Promise<{ item: T; label: string } | null> {
	const item = await ConductorSelectorModal.show(app, options);
	if (!item) return null;
	return { item, label: options.getText(item) };
}

// Prompts for a category and then for a note within it, using the same picker
// for that category whichever command asked for it. Categories with a
// dedicated picker (Music Release, Movie, Artist, Project) get its full
// treatment - cover art, extra search fields, groupings - so they're as
// searchable as they are when opened directly. Every other category falls back
// to a plain note selector built from the category's notes.
//
// `currentFile` is excluded from the fallback list, so a note isn't offered a
// link to itself. The dedicated pickers list their whole category.
export async function selectNoteByCategory(
	app: App,
	options: { currentFile?: TFile | null } = {},
): Promise<SelectedNote | null> {
	const categories = getAllCategories(app);
	if (categories.length === 0) {
		new Notice("No categories found");
		return null;
	}

	const category = await ConductorSelectorModal.show(app, {
		items: categories,
		placeholder: "Select a category...",
		emptyText: "No categories found",
		getText: (cat) => cat,
		sortItems: (a, b) => a.localeCompare(b),
	});
	if (!category) return null;

	switch (category) {
		case "Music Release": {
			const picked = await pickWithLabel(
				app,
				musicReleasePickerOptions(app),
			);
			return picked && { file: picked.item, label: picked.label };
		}
		case "Movie": {
			const picked = await pickWithLabel(app, moviePickerOptions(app));
			return picked && { file: picked.item, label: picked.label };
		}
		case "Artist": {
			const picked = await pickWithLabel(app, artistPickerOptions(app));
			return picked && { file: picked.item, label: picked.label };
		}
		case "Project": {
			const picked = await pickWithLabel(
				app,
				projectSelectorOptions(app, getProjects(app)),
			);
			return picked && { file: picked.item.file, label: picked.label };
		}
	}

	const files = getFilesWithCategory(app, category);
	if (files.length === 0) {
		new Notice(`No notes found for category "${category}"`);
		return null;
	}

	const picked = await pickWithLabel(
		app,
		buildCategoryNoteSelector(app, category, files, options.currentFile),
	);
	return picked && { file: picked.item, label: picked.label };
}