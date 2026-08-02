import { App, Notice } from "obsidian";
import { ChooseTopicModal } from "src/choose-topic-modal";
import { ChooseNoteModal } from "src/choose-note-modal";
import { getTopics, getNotesForTopic } from "src/topics";

export const openNoteByTopic = (app: App): void => {
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
			app.workspace.getLeaf(false).openFile(note);
		};
		chooseNoteModal.open();
	};
	chooseTopicModal.open();
};
