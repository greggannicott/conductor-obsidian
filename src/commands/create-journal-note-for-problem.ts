import { App } from "obsidian";
import { showProblemSelector } from "src/choose-problem-modal";
import { isNoteProblem } from "src/problems";
import { createJournalNote, promptJournalNoteTitle } from "src/journal";

export const createJournalNoteForProblem = async (app: App): Promise<void> => {
	const activeFile = app.workspace.activeEditor?.file;
	const preselectedFiles =
		activeFile && isNoteProblem(app, activeFile) ? [activeFile] : [];

	const problems = await showProblemSelector(app, preselectedFiles);
	if (problems.length === 0) return;

	const title = await promptJournalNoteTitle(app);
	if (!title) return;

	await createJournalNote(app, title, (fm) => {
		fm.problems = problems.map((problem) => `[[${problem.name}]]`);
	});
};
