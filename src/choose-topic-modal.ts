import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Topic } from "./topics";

export function showTopicSelector(
	app: App,
	topics: Topic[],
): Promise<Topic | null> {
	return ConductorSelectorModal.show(app, {
		items: topics ?? [],
		placeholder: "Select a topic...",
		getText: (topic) => topic.name,
	});
}
