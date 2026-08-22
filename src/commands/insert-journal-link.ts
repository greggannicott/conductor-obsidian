import { App, MarkdownView, Notice, moment } from "obsidian";
import { ChooseJournalModal, JournalEntry } from "src/choose-journal-modal";
import { TextInputModal } from "src/text-input-modal";
import { getTopicNamesForNote } from "src/topics";
import { getFilesWithCategory } from "src/utilities";

// Journal basenames look like "2026-08-21 1200 - Title" or "2026-02-15 1232 sprint at the end".
const JOURNAL_TITLE_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{4})(?: - )?(.*)$/;

export const insertJournalLink = async (app: App): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return;
	}

	const entries: JournalEntry[] = [];
	for (const file of getFilesWithCategory(app, "Journal")) {
		// Exclude the journal entry currently being written.
		if (activeView.file && file.path === activeView.file.path) continue;

		const match = file.basename.match(JOURNAL_TITLE_PATTERN);
		if (!match || !match[3].trim()) continue;

		const date = moment(match[1]);
		const sortKey = moment(`${match[1]} ${match[2]}`, "YYYY-MM-DD HHmm").valueOf();
		entries.push({
			file,
			title: match[3].trim(),
			dateText: date.format("dddd D MMMM YYYY"),
			sortKey,
			topics: getTopicNamesForNote(app, file),
		});
	}

	if (entries.length === 0) {
		new Notice("No journal notes found");
		return;
	}

	const chooseJournalModal = new ChooseJournalModal(app);
	chooseJournalModal.entries = entries;
	chooseJournalModal.onChoose = async (entry) => {
		const prompt = await TextInputModal.show(app, {
			title: "Text to display",
			placeholder: "Text to display",
			value: entry.title,
		});
		if (prompt.cancelled) return;

		const displayText = prompt.value.trim() || entry.title;
		activeView.editor.replaceSelection(
			`[[${entry.file.basename}|${displayText}]]`,
		);
		new Notice(`Inserted link to "${displayText}"`);
	};
	chooseJournalModal.open();
};
