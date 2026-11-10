import { App, Notice, TFile } from "obsidian";

export const markNoteAsConsumed = async (app: App): Promise<void> => {
	const file = app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No note is open");
		return;
	}

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (
		!frontmatter ||
		!Object.prototype.hasOwnProperty.call(frontmatter, "consumed")
	) {
		new Notice("Note has no consumed field");
		return;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		if (Object.prototype.hasOwnProperty.call(fm, "to-consume")) {
			fm["to-consume"] = false;
		}
		if (Object.prototype.hasOwnProperty.call(fm, "consumed")) {
			fm["consumed"] = true;
		}
	});

	new Notice("Marked note as consumed");
};
