import { App } from "obsidian";
import { showEpicSelectorSingle } from "src/choose-epic-modal";
import {
	Epic,
	getEpicFromFile,
	getEpicFromFrontmatter,
	isNoteEpic,
} from "src/epics";
import { createJournalNote, promptJournalNoteTitle } from "src/journal";

// The epic the note is about, when the active note gives it away: either the
// epic itself is open, or the note carries an `epic` link (tasks do).
function getPreselectedEpic(app: App): Epic | null {
	const activeFile = app.workspace.activeEditor?.file;
	if (!activeFile) return null;
	if (isNoteEpic(app, activeFile)) return getEpicFromFile(app, activeFile);
	return getEpicFromFrontmatter(app, activeFile);
}

export const createJournalNoteForEpic = async (app: App): Promise<void> => {
	const epic = await showEpicSelectorSingle(app, getPreselectedEpic(app));
	if (!epic) return;

	const title = await promptJournalNoteTitle(app);
	if (!title) return;

	await createJournalNote(app, title, (fm) => {
		fm.topics = [`[[${epic.name}]]`];
	});
};
