import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getInboxFiles, getInboxDateGrouping } from "src/utilities";

export const openInboxNote = async (app: App): Promise<void> => {
	const files = getInboxFiles(app);
	if (files.length === 0) {
		new Notice("No inbox notes found");
		return;
	}

	const file = await ConductorSelectorModal.show(app, {
		items: files,
		placeholder: "Select an inbox note...",
		emptyText: "No inbox notes found",
		getText: (f) => f.basename,
		sortItems: (a, b) => a.basename.localeCompare(b.basename),
		groupings: [getInboxDateGrouping(app)],
	});

	if (!file) return;
	await app.workspace.getLeaf(false).openFile(file);
};