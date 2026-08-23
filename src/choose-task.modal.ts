import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Task } from "./tasks";

type GroupMode = "priority" | "status";
export type ShowTaskSelectorOptions = {
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

function getTaskText(task: Task): string {
	if (task.parents?.length == 1) {
		return `${task.parents[0].name} -> ${task.name}`;
	} else if (task.parents?.length > 1) {
		return `${task.parents.map((p) => p.name).join(", ")} -> ${task.name}`;
	} else {
		return task.name;
	}
}

export function showTaskSelector(
	app: App,
	tasks: (Task | null)[],
	options?: ShowTaskSelectorOptions,
): Promise<Task | null> {
	const validTasks = (tasks ?? []).filter((t): t is Task => t !== null);
	const byName = (a: Task, b: Task) =>
		getTaskText(a).localeCompare(getTaskText(b));

	return ConductorSelectorModal.show<Task>(app, {
		items: validTasks,
		placeholder: "Select a task...",
		getText: getTaskText,
		sortItems: byName,
		initialGroupingId: options?.initialGroupMode ?? "priority",
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
	});
}

const STATUS_EMOJI: Record<string, string> = {
	"01 - To Do": "⭕",
	"02 - In Progress": "🔄",
	"03 - Done": "✅",
	"04 - Abandoned": "❌",
	"05 - Won't Do": "🙅🏼‍♂️",
};
