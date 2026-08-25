import { App, MarkdownView, Notice } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { buildCategoryNoteSelector } from "src/category-config";
import { getAllCategories, getFilesWithCategory } from "src/utilities";

export const insertLinkByCategory = async (app: App): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return;
	}

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

	const files = getFilesWithCategory(app, category);
	if (files.length === 0) {
		new Notice(`No notes found for category "${category}"`);
		return;
	}

	const selectorOptions = buildCategoryNoteSelector(
		app,
		category,
		files,
		activeView.file,
	);
	const file = await ConductorSelectorModal.show(app, selectorOptions);
	if (!file) return;

	const displayLabel = selectorOptions.getText(file);
	const prompt = await TextInputModal.show(app, {
		title: "Text to display",
		placeholder: "Text to display",
		value: displayLabel,
	});
	if (prompt.cancelled) return;

	const displayText = prompt.value.trim() || displayLabel;
	activeView.editor.replaceSelection(
		`[[${file.basename}|${displayText}]]`,
	);
	new Notice(`Inserted link to "${displayText}"`);
};
