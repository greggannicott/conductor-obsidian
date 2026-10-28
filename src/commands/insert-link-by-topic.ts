import { App, MarkdownView, Notice } from "obsidian";
import { showTopicSelector } from "src/choose-topic-modal";
import { showNoteSelector } from "src/choose-note-modal";
import { getTopics, getNotesForTopic } from "src/topics";
import { TextInputModal } from "src/text-input-modal";

export const insertLinkByTopic = async (app: App): Promise<void> => {
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

	const topic = await showTopicSelector(app, topics);
	if (!topic) return;

	const notes = getNotesForTopic(app, topic);
	if (notes.length === 0) {
		new Notice(`No notes found for topic "${topic.name}"`);
		return;
	}

	const note = await showNoteSelector(app, notes);
	if (!note) return;

	const label = note.basename;
	const prompt = await TextInputModal.show(app, {
		title: "Text to display",
		placeholder: "Text to display",
		value: label,
	});
	if (prompt.cancelled) return;

	const displayText = prompt.value.trim() || label;
	activeView.editor.replaceSelection(`[[${note.basename}|${displayText}]]`);
	new Notice(`Inserted link to "${displayText}"`);
};
