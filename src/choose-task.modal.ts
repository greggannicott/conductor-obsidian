import { FuzzySuggestModal, App } from "obsidian";
import { Task } from "./tasks";

type onChooseCallback = (task: Task) => void;

export class ChooseTaskModal extends FuzzySuggestModal<Task> {
	public tasks: Task[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a task...");
	}

	getItems(): Task[] {
		return this.tasks;
	}

	getItemText(task: Task): string {
		return `${task.name}`;
	}

	onChooseItem(task: Task, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(task);
	}
}
