import { App, MarkdownView, Notice } from "obsidian";
import { selectNoteByCategory } from "src/choose-note-by-category-modal";
import { TextInputModal } from "src/text-input-modal";

export const insertLinkByCategory = async (
	app: App,
	options: { preselectCategory?: string } = {},
): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const selected = await selectNoteByCategory(app, {
		currentFile: activeView.file,
		preselectCategory: options.preselectCategory,
	});
	if (!selected) return false;

	const { file, label } = selected;
	const prompt = await TextInputModal.show(app, {
		title: "Text to display",
		placeholder: "Text to display",
		value: label,
	});
	if (prompt.cancelled) return false;

	const displayText = prompt.value.trim() || label;
	activeView.editor.replaceSelection(`[[${file.basename}|${displayText}]]`);
	new Notice(`Inserted link to "${displayText}"`);
	return true;
};