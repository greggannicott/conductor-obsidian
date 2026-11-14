import { App, MarkdownView, Notice } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getInboxFiles, getInboxDateGrouping } from "src/utilities";

export const insertInboxLink = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const inboxFiles = getInboxFiles(app).sort((a, b) =>
		a.basename.localeCompare(b.basename),
	);
	if (inboxFiles.length === 0) {
		new Notice("No inbox notes found");
		return false;
	}

	const selected = await ConductorSelectorModal.show(app, {
		items: inboxFiles,
		placeholder: "Select an inbox note...",
		emptyText: "No inbox notes found",
		getText: (file) => file.basename,
		groupings: [getInboxDateGrouping(app)],
	});
	if (!selected) return false;

	activeView.editor.replaceSelection(`[[${selected.basename}]]`);
	new Notice(`Inserted link to "${selected.basename}"`);
	return true;
};