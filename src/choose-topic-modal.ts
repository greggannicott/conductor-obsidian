import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Topic, getNotesForTopic } from "./topics";

export function showTopicSelector(
	app: App,
	topics: Topic[],
): Promise<Topic | null> {
	const counts = new Map<string, number>();
	for (const topic of topics ?? []) {
		counts.set(topic.path, getNotesForTopic(app, topic).length);
	}
	return ConductorSelectorModal.show(app, {
		items: topics ?? [],
		placeholder: "Select a topic...",
		getText: (topic) => topic.name,
		getTitleRightMeta: (topic) => `${counts.get(topic.path) ?? 0}`,
	});
}