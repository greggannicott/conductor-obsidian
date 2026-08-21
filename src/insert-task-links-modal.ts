import { App, Modal, prepareFuzzySearch } from "obsidian";
import { Task, getTasks, TaskPriority, TaskStatus, TaskType } from "./tasks";
import { Context, getProjects, outstandingProjectTypes } from "./projects";

export type onChooseCallback = (tasks: Task[]) => void;

const priorityOrder: Record<string, number> = {
	"01 - High": 0,
	"02 - Medium": 1,
	"03 - Low": 2,
};

const priorityEmoji: Record<string, string> = {
	"01 - High": "🔴",
	"02 - Medium": "🟡",
	"03 - Low": "🟢",
};

const statusEmoji: Record<string, string> = {
	"01 - To Do": "⭕",
	"02 - In Progress": "🔄",
};

const contextOrder: Record<string, number> = {
	[Context.Work]: 0,
	[Context.Personal]: 1,
};

export class InsertTaskLinksModal extends Modal {
	public onChoose: onChooseCallback;

	private allGroups: { projectName: string; tasks: Task[] }[] = [];
	private filteredGroups: { projectName: string; tasks: Task[] }[] = [];
	private selectedPaths: Set<string> = new Set();
	private highlightedIndex = 0;
	private taskPathMap: Map<string, Task> = new Map();

	private searchInput: HTMLInputElement;
	private resultsEl: HTMLElement;
	private footerEl: HTMLElement;

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("insert-task-links-modal");

		this.modalEl.style.width = "500px";

		this.searchInput = contentEl.createEl("input", {
			cls: "insert-task-links-search",
			attr: { placeholder: "Filter tasks by name or project..." },
		});
		this.searchInput.addEventListener("input", () => this.onSearchInput());
		this.searchInput.addEventListener("keydown", (e) => this.onKeydown(e));

		this.resultsEl = contentEl.createDiv({ cls: "insert-task-links-list" });

		this.footerEl = contentEl.createDiv({ cls: "insert-task-links-footer" });

		this.loadData();
		this.applyFilter();
		this.render();

		setTimeout(() => this.searchInput.focus(), 50);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private loadData(): void {
		const allTasks = getTasks(this.app, {
			statusFilter: {
				statusIs: [TaskStatus.ToDo, TaskStatus.InProgress],
			},
			typeFilter: {
				typeExcludes: [TaskType.BlogPost],
			},
		});

		const validTasks = allTasks
			.filter((t): t is Task => t !== null)
			.filter((t) =>
				[TaskPriority.High, TaskPriority.Medium].includes(t.priority),
			);

		const allProjects = getProjects(this.app);
		const outstandingProjectNames = new Set(
			allProjects
				.filter((p) => {
					const isOutstandingNonOngoing =
						outstandingProjectTypes.includes(p.status) && !p.ongoing;
					const isOngoing = p.ongoing;
					return isOutstandingNonOngoing || isOngoing;
				})
				.map((p) => p.name),
		);

		const tasksWithOutstandingProjects = validTasks.filter((t) => {
			const parentName = t.parents?.[0]?.name;
			return parentName && outstandingProjectNames.has(parentName);
		});

		this.taskPathMap = new Map(
			tasksWithOutstandingProjects.map((t) => [t.path, t]),
		);

		const groupMap = new Map<
			string,
			{ context: Context | null; tasks: Task[] }
		>();
		for (const task of tasksWithOutstandingProjects) {
			const project = task.parents?.[0];
			const projectName = project?.name || "Uncategorized";
			if (!groupMap.has(projectName)) {
				groupMap.set(projectName, {
					context: project?.context ?? null,
					tasks: [],
				});
			}
			groupMap.get(projectName)!.tasks.push(task);
		}

		for (const [, { tasks }] of groupMap) {
			tasks.sort((a, b) => {
				const pa = priorityOrder[a.priority] ?? 2;
				const pb = priorityOrder[b.priority] ?? 2;
				return pa - pb;
			});
		}

		this.allGroups = [...groupMap.entries()]
			.sort(([nameA, a], [nameB, b]) => {
				const ca = contextOrder[a.context ?? ""] ?? 2;
				const cb = contextOrder[b.context ?? ""] ?? 2;
				if (ca !== cb) return ca - cb;
				return nameA.localeCompare(nameB);
			})
			.map(([projectName, { tasks }]) => ({ projectName, tasks }));
	}

	private onSearchInput(): void {
		this.applyFilter();
		this.highlightedIndex = 0;
		this.render();
	}

	private applyFilter(): void {
		const query = this.searchInput.value.trim();

		if (query.length === 0) {
			this.filteredGroups = this.allGroups.map((g) => ({
				projectName: g.projectName,
				tasks: [...g.tasks],
			}));
			return;
		}

		const search = prepareFuzzySearch(query);

		this.filteredGroups = this.allGroups
			.map((group) => {
				const filteredTasks = group.tasks.filter((task) => {
					return search(task.name) || search(group.projectName);
				});
				return { projectName: group.projectName, tasks: filteredTasks };
			})
			.filter((group) => group.tasks.length > 0);
	}

	private render(): void {
		this.resultsEl.empty();

		let itemIndex = 0;
		let foundAny = false;

		for (const group of this.filteredGroups) {
			this.resultsEl.createDiv({
				cls: "insert-task-links-group-header",
				text: group.projectName,
			});

			for (const task of group.tasks) {
				foundAny = true;
				const isSelected = this.selectedPaths.has(task.path);
				const isHighlighted = itemIndex === this.highlightedIndex;

				const itemEl = this.resultsEl.createDiv({
					cls: "insert-task-links-item",
				});

				if (isSelected) {
					itemEl.addClass("is-selected");
				}
				if (isHighlighted) {
					itemEl.addClass("is-highlighted");
				}

				itemEl.dataset.itemIndex = String(itemIndex);

				itemEl.createSpan({
					cls: "insert-task-links-check",
					text: isSelected ? "☑" : "☐",
				});

				itemEl.createSpan({
					cls: "insert-task-links-name",
					text: task.name,
				});

				itemEl.createSpan({
					cls: "insert-task-links-priority",
					text: priorityEmoji[task.priority] ?? "",
				});

				itemEl.createSpan({
					cls: "insert-task-links-status",
					text: statusEmoji[task.status] ?? "",
				});

				const currentItemIndex = itemIndex;

				itemEl.addEventListener("click", () => {
					this.highlightedIndex = currentItemIndex;
					this.toggleTask(task.path);
					this.render();
					this.searchInput.focus();
				});

				itemIndex++;
			}
		}

		if (!foundAny) {
			const message = this.searchInput.value.trim()
				? "No tasks match your search"
				: "No outstanding tasks";
			this.resultsEl.createDiv({
				cls: "insert-task-links-empty",
				text: message,
			});
		}

		this.updateFooter();
		this.ensureHighlightedVisible();
	}

	private onKeydown(e: KeyboardEvent): void {
		if (e.isComposing) return;

		if (e.key === "ArrowDown" || (e.ctrlKey && ["n", "j"].includes(e.key.toLowerCase()))) {
			e.preventDefault();
			const maxIndex = this.getMaxItemIndex();
			if (this.highlightedIndex < maxIndex) {
				this.highlightedIndex++;
				this.render();
			}
		} else if (e.key === "ArrowUp" || (e.ctrlKey && ["p", "k"].includes(e.key.toLowerCase()))) {
			e.preventDefault();
			if (this.highlightedIndex > 0) {
				this.highlightedIndex--;
				this.render();
			}
		} else if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			this.confirmSelection();
		} else if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
			e.preventDefault();
			const task = this.getHighlightedTask();
			if (task) {
				this.toggleTask(task.path);
				this.render();
			}
		}
	}

	private toggleTask(path: string): void {
		if (this.selectedPaths.has(path)) {
			this.selectedPaths.delete(path);
		} else {
			this.selectedPaths.add(path);
		}
	}

	private getHighlightedTask(): Task | null {
		let itemIndex = 0;
		for (const group of this.filteredGroups) {
			for (const task of group.tasks) {
				if (itemIndex === this.highlightedIndex) {
					return task;
				}
				itemIndex++;
			}
		}
		return null;
	}

	private getMaxItemIndex(): number {
		let count = 0;
		for (const group of this.filteredGroups) {
			count += group.tasks.length;
		}
		return count - 1;
	}

	private confirmSelection(): void {
		const selectedTasks: Task[] = [];
		for (const path of this.selectedPaths) {
			const task = this.taskPathMap.get(path);
			if (task) {
				selectedTasks.push(task);
			}
		}

		if (selectedTasks.length === 0) {
			const highlightedTask = this.getHighlightedTask();
			if (highlightedTask) {
				selectedTasks.push(highlightedTask);
			}
		}

		if (selectedTasks.length === 0) return;

		this.onChoose(selectedTasks);
		this.close();
	}

	private ensureHighlightedVisible(): void {
		const highlighted = this.resultsEl.querySelector(".is-highlighted");
		if (highlighted) {
			highlighted.scrollIntoView({ block: "nearest" });
		}
	}

	private updateFooter(): void {
		const count = this.selectedPaths.size;
		if (count > 0) {
			this.footerEl.setText(
				`${count} selected  •  Ctrl+Space: toggle  •  ↵: insert`,
			);
		} else {
			this.footerEl.setText("Ctrl+Space: toggle  •  ↵: insert");
		}
	}
}
