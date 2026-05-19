import { App, prepareFuzzySearch, SearchResult, SuggestModal } from "obsidian";
import { Task } from "./tasks";

type onChooseCallback = (task: Task) => void;

type GroupMode = "priority" | "status";

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
	private groupMode: GroupMode = "priority";
	private handleToggleKeydown: ((e: KeyboardEvent) => void) | null = null;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a task...");
		this.updateInstructions();
	}

	onOpen(): void {
		super.onOpen();
		this.handleToggleKeydown = (e: KeyboardEvent) => {
			if (e.isComposing) return;
			// Only allow toggling when not searching.
			if (this.inputEl.value.trim().length > 0) return;
			// Require Cmd (macOS) so normal typing works.
			if (!e.metaKey) return;

			if (e.key === "p" || e.key === "P") {
				e.preventDefault();
				this.groupMode = "priority";
				this.updateInstructions();
				this.inputEl.dispatchEvent(new Event("input"));
				return;
			}
			if (e.key === "s" || e.key === "S") {
				e.preventDefault();
				this.groupMode = "status";
				this.updateInstructions();
				this.inputEl.dispatchEvent(new Event("input"));
				return;
			}
		};
		this.inputEl.addEventListener("keydown", this.handleToggleKeydown);
	}

	onClose(): void {
		if (this.handleToggleKeydown) {
			this.inputEl.removeEventListener("keydown", this.handleToggleKeydown);
			this.handleToggleKeydown = null;
		}
		super.onClose();
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
			return matches.map(({ task }) => ({ kind: "task" as const, task }));
		}

		return this.groupMode === "priority"
			? this.getPriorityGroupedItems(normalizedTasks)
			: this.getStatusGroupedItems(normalizedTasks);
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

	private getPriorityGroupedItems(tasks: Task[]): TaskModalItem[] {
		const high: Task[] = [];
		const medium: Task[] = [];
		const low: Task[] = [];

		for (const task of tasks) {
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

		high.sort((a, b) => this.getTaskText(a).localeCompare(this.getTaskText(b)));
		medium.sort((a, b) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b)),
		);
		low.sort((a, b) => this.getTaskText(a).localeCompare(this.getTaskText(b)));

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

	private getStatusGroupedItems(tasks: Task[]): TaskModalItem[] {
		const todo: Task[] = [];
		const inProgress: Task[] = [];
		const done: Task[] = [];
		const abandoned: Task[] = [];
		const wontDo: Task[] = [];

		for (const task of tasks) {
			switch (task.status) {
				case "01 - To Do":
					todo.push(task);
					break;
				case "02 - In Progress":
					inProgress.push(task);
					break;
				case "03 - Done":
					done.push(task);
					break;
				case "04 - Abandoned":
					abandoned.push(task);
					break;
				case "05 - Won't Do":
					wontDo.push(task);
					break;
				default:
					todo.push(task);
					break;
			}
		}

		const byName = (a: Task, b: Task) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b));
		todo.sort(byName);
		inProgress.sort(byName);
		done.sort(byName);
		abandoned.sort(byName);
		wontDo.sort(byName);

		const items: TaskModalItem[] = [];
		if (inProgress.length > 0) {
			items.push({ kind: "header", title: "🔄 02 - In Progress" });
			items.push(
				...inProgress.map((task) => ({ kind: "task" as const, task })),
			);
		}
		if (done.length > 0) {
			items.push({ kind: "header", title: "✅ 03 - Done" });
			items.push(
				...done.map((task) => ({ kind: "task" as const, task })),
			);
		}
		if (abandoned.length > 0) {
			items.push({ kind: "header", title: "❌ 04 - Abandoned" });
			items.push(
				...abandoned.map((task) => ({ kind: "task" as const, task })),
			);
		}
		if (wontDo.length > 0) {
			items.push({ kind: "header", title: "🙅🏼‍♂️ 05 - Won't Do" });
			items.push(
				...wontDo.map((task) => ({ kind: "task" as const, task })),
			);
		}
		// Keep To Do at the bottom so In Progress is quick to reach.
		if (todo.length > 0) {
			items.push({ kind: "header", title: "⭕ 01 - To Do" });
			items.push(
				...todo.map((task) => ({ kind: "task" as const, task })),
			);
		}
		return items;
	}

	private updateInstructions(): void {
		this.setInstructions([
			{ command: "P", purpose: "Group by Priority" },
			{ command: "S", purpose: "Group by Status" },
		]);
	}
}
