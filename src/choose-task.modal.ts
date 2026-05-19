import { App, prepareFuzzySearch, SearchResult, SuggestModal } from "obsidian";
import { Task } from "./tasks";

type onChooseCallback = (task: Task) => void;

type TaskModalItem =
	| {
			kind: "header";
			title: string;
	  }
	| {
			kind: "task";
			task: Task;
	  };

export class ChooseTaskModal extends SuggestModal<TaskModalItem> {
	public tasks: (Task | null)[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a task...");
	}

	getSuggestions(query: string): TaskModalItem[] {
		const normalizedTasks = (this.tasks ?? []).filter(
			(t): t is Task => t !== null,
		);

		const q = query.trim();
		if (q.length > 0) {
			// Flat list while searching.
			const search = prepareFuzzySearch(q);
			const matches: { task: Task; match: SearchResult }[] = [];
			for (const task of normalizedTasks) {
				const text = this.getTaskText(task);
				const result = search(text);
				if (result) {
					matches.push({ task, match: result });
				}
			}
			matches.sort((a, b) => b.match.score - a.match.score);
			return matches.map(({ task }) => ({ kind: "task", task }));
		}

		// Grouped list when not searching.
		const high: Task[] = [];
		const medium: Task[] = [];
		const low: Task[] = [];

		for (const task of normalizedTasks) {
			// Treat missing priority as Low.
			switch (task.priority) {
				case "01 - High":
					high.push(task);
					break;
				case "02 - Medium":
					medium.push(task);
					break;
				case "03 - Low":
				default:
					low.push(task);
					break;
			}
		}

		high.sort((a, b) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b)),
		);
		medium.sort((a, b) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b)),
		);
		low.sort((a, b) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b)),
		);

		const items: TaskModalItem[] = [];
		if (high.length > 0) {
			items.push({ kind: "header", title: "🔴 01 - High" });
			items.push(
				...high.map((task) => ({ kind: "task" as const, task })),
			);
		}
		if (medium.length > 0) {
			items.push({ kind: "header", title: "🟡 02 - Medium" });
			items.push(
				...medium.map((task) => ({ kind: "task" as const, task })),
			);
		}
		if (low.length > 0) {
			items.push({ kind: "header", title: "🟢 03 - Low" });
			items.push(...low.map((task) => ({ kind: "task" as const, task })));
		}
		return items;
	}

	renderSuggestion(item: TaskModalItem, el: HTMLElement): void {
		if (item.kind === "header") {
			el.addClass("conductor-suggest-header");
			el.setAttr("aria-disabled", "true");
			el.createDiv({ text: item.title });
			return;
		}

		el.createDiv({ text: this.getTaskText(item.task) });
	}

	onChooseSuggestion(
		item: TaskModalItem,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (item.kind === "header") return;
		this.onChoose(item.task);
		// SuggestModal doesn't close automatically unless we do it.
		evt.preventDefault();
		this.close();
	}

	private getTaskText(task: Task): string {
		if (task.parents?.length == 1) {
			return `${task.parents[0].name} -> ${task.name}`;
		} else if (task.parents?.length > 1) {
			return `${task.parents.map((p) => p.name).join(", ")} -> ${task.name}`;
		} else {
			return task.name;
		}
	}
}
