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
		if (task.parents?.length == 1) {
			return `${task.parents[0]} -> ${task.name}`;
		} else if (task.parents?.length > 1) {
			return `${task.parents.join(", ")} -> ${task.name}`;
		} else {
			return task.name;
		}
	}

	onChooseItem(task: Task, _evt: MouseEvent | KeyboardEvent) {
		this.onChoose(task);
	}
}
