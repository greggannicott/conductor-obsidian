import { App, Notice, TFile } from "obsidian";
import { getReleaseSummary } from "src/music-release";

export function isForFocusing(app: App, file: TFile): boolean {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	return frontmatter?.["for-focusing"] === true;
}

export const setForFocusingToTrue = async (
	app: App,
	targetFile?: TFile,
): Promise<void> => {
	const file = targetFile ?? app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No note is open");
		return;
	}
	if (!isFileCategoryMusicRelease(app, file)) {
		new Notice("Not a music release");
		return;
	}

	const summary = getReleaseSummary(app, file);
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["for-focusing"] = true;
	});
	new Notice(`Set 'For Focusing' to true for ${summary}`);
};

export const toggleForFocusing = async (
	app: App,
	file: TFile,
): Promise<void> => {
	if (!isFileCategoryMusicRelease(app, file)) {
		new Notice("Not a music release");
		return;
	}

	const next = !isForFocusing(app, file);
	const summary = getReleaseSummary(app, file);
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["for-focusing"] = next;
	});
	new Notice(
		`Set 'For Focusing' to ${next ? "true" : "false"} for ${summary}`,
	);
};

function isFileCategoryMusicRelease(app: App, file: TFile): boolean {
	const categories = app.metadataCache.getFileCache(file)?.frontmatter
		?.categories;
	return Array.isArray(categories) && categories.includes("[[Music Release]]");
}
