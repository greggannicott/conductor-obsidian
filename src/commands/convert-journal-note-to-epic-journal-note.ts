import { App, Notice, TFile, parseFrontMatterStringArray } from "obsidian";
import { showEpicSelectorSingle } from "src/choose-epic-modal";

export const convertJournalNoteToEpicJournalNote = async (
	app: App,
	targetFile?: TFile,
): Promise<void> => {
	const file = targetFile ?? app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No active note to convert.");
		return;
	}

	if (file.extension !== "md") {
		new Notice(`[${file.name}] is not a markdown note.`);
		return;
	}

	if (file.path.startsWith("_templates/")) {
		new Notice("Templates cannot be converted.");
		return;
	}

	if (!isJournalNote(app, file)) {
		new Notice(`[${file.name}] is not a journal note.`);
		return;
	}

	const epic = await showEpicSelectorSingle(app);
	if (!epic) {
		new Notice("No epic selected.");
		return;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.categories = Array.isArray(fm.categories) ? fm.categories : [];
		if (!fm.categories.includes("[[Journal]]")) {
			fm.categories.push("[[Journal]]");
		}
		fm.topics = [`[[${epic.name}]]`];
	});

	new Notice(
		`Set epic topic to [${epic.name}] for [${file.basename}]`,
	);
};

export const isJournalNoteConvertibleToEpic = (
	app: App,
	file: TFile,
): boolean => {
	if (file.extension !== "md") return false;
	if (file.path.startsWith("_templates/")) return false;
	return isJournalNote(app, file);
};

const isJournalNote = (app: App, file: TFile): boolean => {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const categories = parseFrontMatterStringArray(frontmatter, "categories");
	return categories?.includes("[[Journal]]") ?? false;
};
