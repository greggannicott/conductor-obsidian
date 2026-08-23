import { App, Notice } from "obsidian";
import { showTopicSelector } from "src/choose-topic-modal";
import { showNoteSelector } from "src/choose-note-modal";
import { getTopics, getNotesForTopic } from "src/topics";

export const openNoteByTopic = async (app: App): Promise<void> => {
	const topics = getTopics(app);
	if (topics.length === 0) {
		new Notice("No topics found");
		return;
	}

	const topic = await showTopicSelector(app, topics);
	if (!topic) return;

	const notes = getNotesForTopic(app, topic);
	if (notes.length === 0) {
		new Notice(`No notes found for topic "${topic.name}"`);
		return;
	}

	const note = await showNoteSelector(app, notes);
	if (!note) return;
	await app.workspace.getLeaf(false).openFile(note);
};
