import { App, MarkdownView, Notice } from "obsidian";
import { ChooseTopicModal } from "src/choose-topic-modal";
import { ChooseNoteModal } from "src/choose-note-modal";
import { getTopics, getNotesForTopic } from "src/topics";

export const insertLinkByTopic = (app: App): void => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return;
	}

	const topics = getTopics(app);
	if (topics.length === 0) {
		new Notice("No topics found");
		return;
	}

	const chooseTopicModal = new ChooseTopicModal(app);
	chooseTopicModal.topics = topics;
	chooseTopicModal.onChoose = (topic) => {
		const notes = getNotesForTopic(app, topic);
		if (notes.length === 0) {
			new Notice(`No notes found for topic "${topic.name}"`);
			return;
		}

		const chooseNoteModal = new ChooseNoteModal(app);
		chooseNoteModal.notes = notes;
		chooseNoteModal.onChoose = (note) => {
			activeView.editor.replaceSelection(`[[${note.basename}]]`);
			new Notice(`Inserted link to "${note.basename}"`);
		};
		chooseNoteModal.open();
	};
	chooseTopicModal.open();
};
