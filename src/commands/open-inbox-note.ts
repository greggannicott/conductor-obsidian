import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { fileHasTag } from "src/utilities";

// Inbox notes are any Markdown notes tagged `#inbox` (in frontmatter or inline).
// Templates are excluded.
const getInboxFiles = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((file) => {
		if (file.path.startsWith("_templates/")) return false;
		if (fileHasTag(app, file, "inbox")) return true;
		const cache = app.metadataCache.getFileCache(file);
		return (cache?.tags ?? []).some((t) => t.tag === "#inbox");
	});

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
	});

	if (!file) return;
	await app.workspace.getLeaf(false).openFile(file);
};