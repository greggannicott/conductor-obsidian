import { App, Notice, TFile } from "obsidian";
import { showExperimentSelectorSingle } from "src/choose-experiment-modal";
import { Experiment } from "src/experiments";
import { parseFrontMatterStringArray } from "obsidian";

export const convertJournalNoteToExperimentJournalNote = async (
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

	const experiment = await promptForExperiment(app);
	if (!experiment) {
		new Notice("No experiment selected.");
		return;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.categories = Array.isArray(fm.categories) ? fm.categories : [];
		if (!fm.categories.includes("[[Journal]]")) {
			fm.categories.push("[[Journal]]");
		}
		fm.topics = [`[[${experiment.name}]]`];
	});

	new Notice(
		`Set experiment topic to [${experiment.name}] for [${file.basename}]`,
	);
};

export const isJournalNoteConvertibleToExperiment = (
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

const promptForExperiment = (app: App): Promise<Experiment | null> => {
	return showExperimentSelectorSingle(app);
};
