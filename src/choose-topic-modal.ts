import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Topic } from "./topics";

type onChooseCallback = (topic: Topic) => void;

export class ChooseTopicModal {
	public topics: Topic[];
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<Topic>(this.app, {
			items: this.topics ?? [],
			placeholder: "Select a topic...",
			getText: (topic) => topic.name,
			onSelect: (topic) => this.onChoose(topic),
		}).open();
	}
}
