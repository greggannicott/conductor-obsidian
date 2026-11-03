import { App } from "obsidian";
import { showExperimentSelector } from "src/choose-experiment-modal";
import { isNoteExperiment } from "src/experiments";
import { createJournalNote, promptJournalNoteTitle } from "src/journal";

export const createJournalNoteForExperiment = async (
	app: App,
): Promise<void> => {
	const activeFile = app.workspace.activeEditor?.file;
	const preselectedFiles =
		activeFile && isNoteExperiment(app, activeFile) ? [activeFile] : [];

	const experiments = await showExperimentSelector(app, preselectedFiles);
	if (experiments.length === 0) return;

	const title = await promptJournalNoteTitle(app);
	if (!title) return;

	await createJournalNote(app, title, (fm) => {
		fm.topics = experiments.map((experiment) => `[[${experiment.name}]]`);
	});
};
