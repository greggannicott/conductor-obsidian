import { FuzzySuggestModal, App } from "obsidian";
import { Topic } from "./topics";

type onChooseCallback = (topic: Topic) => void;

export class ChooseTopicModal extends FuzzySuggestModal<Topic> {
	public topics: Topic[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a topic...");
	}

	getItems(): Topic[] {
		return this.topics;
	}

	getItemText(topic: Topic): string {
		return topic.name;
	}

	onChooseItem(topic: Topic, _: MouseEvent | KeyboardEvent) {
		this.onChoose(topic);
	}
}
