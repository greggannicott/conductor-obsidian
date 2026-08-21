import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Task } from "./tasks";

type onChooseCallback = (task: Task) => void;

type GroupMode = "priority" | "status";
type ChooseTaskModalOptions = {
	initialGroupMode?: GroupMode;
};

const PRIORITY_HEADERS: Record<string, string> = {
	"01 - High": "🔴 01 - High",
	"02 - Medium": "🟡 02 - Medium",
	"03 - Low": "🟢 03 - Low",
};

// Order in which status buckets are displayed; To Do is kept last so
// In Progress is quick to reach.
const STATUS_ORDER: string[] = [
	"02 - In Progress",
	"03 - Done",
	"04 - Abandoned",
	"05 - Won't Do",
	"01 - To Do",
];

// Unknown priorities fall back to Low, matching the previous behaviour.
const priorityBucket = (priority?: string): string =>
	priority === "01 - High" || priority === "02 - Medium"
		? priority
		: "03 - Low";

// Unknown statuses fall back to To Do, matching the previous behaviour.
const statusBucket = (status?: string): string =>
	status !== undefined && STATUS_ORDER.includes(status)
		? status
		: "01 - To Do";

export class ChooseTaskModal {
	public tasks: (Task | null)[];
	public onChoose: onChooseCallback;

	private app: App;
	private initialGroupMode: GroupMode;

	constructor(app: App, options?: ChooseTaskModalOptions) {
		this.app = app;
		this.initialGroupMode = options?.initialGroupMode ?? "priority";
	}

	open(): void {
		const tasks = (this.tasks ?? []).filter((t): t is Task => t !== null);
		const byName = (a: Task, b: Task) =>
			this.getTaskText(a).localeCompare(this.getTaskText(b));

		new ConductorSelectorModal<Task>(this.app, {
			items: tasks,
			placeholder: "Select a task...",
			getText: (task) => this.getTaskText(task),
			sortItems: byName,
			initialGroupingId: this.initialGroupMode,
			groupings: [
				{
					id: "priority",
					label: "Group by Priority",
					toggleKey: "p",
					buildGroups: (items) => {
						const buckets = new Map<string, Task[]>();
						for (const task of items) {
							const key = priorityBucket(task.priority);
							if (!buckets.has(key)) buckets.set(key, []);
							buckets.get(key)!.push(task);
						}
						return Object.entries(PRIORITY_HEADERS).map(
							([priority, header]) => ({
								header,
								items: buckets.get(priority) ?? [],
							}),
						);
					},
				},
				{
					id: "status",
					label: "Group by Status",
					toggleKey: "s",
					buildGroups: (items) => {
						const buckets = new Map<string, Task[]>();
						for (const task of items) {
							const key = statusBucket(task.status);
							if (!buckets.has(key)) buckets.set(key, []);
							buckets.get(key)!.push(task);
						}
						return STATUS_ORDER.map((status) => ({
							header: `${STATUS_EMOJI[status]} ${status}`,
							items: buckets.get(status) ?? [],
						}));
					},
				},
			],
			onSelect: (task) => this.onChoose(task),
		}).open();
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

const STATUS_EMOJI: Record<string, string> = {
	"01 - To Do": "⭕",
	"02 - In Progress": "🔄",
	"03 - Done": "✅",
	"04 - Abandoned": "❌",
	"05 - Won't Do": "🙅🏼‍♂️",
};
