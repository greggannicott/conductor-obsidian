import { App } from "obsidian";
import { selectNoteByCategory } from "src/choose-note-by-category-modal";

export const openNoteByCategory = async (app: App): Promise<void> => {
	const selected = await selectNoteByCategory(app, {
		currentFile: app.workspace.activeEditor?.file,
	});
	if (!selected) return;

	await app.workspace.getLeaf(false).openFile(selected.file);
};