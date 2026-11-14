import { App, Notice } from "obsidian";
import { showTopicSelector } from "src/choose-topic-modal";
import { getTopics } from "src/topics";

export const openTopic = async (app: App): Promise<void> => {
	const topics = getTopics(app);
	if (topics.length === 0) {
		new Notice("No topics found");
		return;
	}

	const topic = await showTopicSelector(app, topics);
	if (!topic) return;

	await app.workspace.getLeaf(false).openFile(topic.file);
};
