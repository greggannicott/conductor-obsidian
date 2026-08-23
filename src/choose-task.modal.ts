import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	Task,
	TaskPriority,
	TaskStatus,
	TASK_PRIORITIES,
	PRIORITY_EMOJI,
	STATUS_EMOJI,
} from "./tasks";

type GroupMode = "priority" | "status";
export type ShowTaskSelectorOptions = {
	initialGroupMode?: GroupMode;
};

// Order in which status buckets are displayed; To Do is kept last so
// In Progress is quick to reach.
const STATUS_ORDER: TaskStatus[] = [
	TaskStatus.InProgress,
	TaskStatus.Done,
	TaskStatus.Abandoned,
	TaskStatus.WontDo,
	TaskStatus.ToDo,
];

// Unknown priorities fall back to Low, matching the previous behaviour.
const priorityBucket = (priority?: string): TaskPriority =>
	priority === TaskPriority.High || priority === TaskPriority.Medium
		? (priority as TaskPriority)
		: TaskPriority.Low;

// Unknown statuses fall back to To Do, matching the previous behaviour.
const statusBucket = (status?: string): TaskStatus =>
	status !== undefined && (STATUS_ORDER as string[]).includes(status)
		? (status as TaskStatus)
		: TaskStatus.ToDo;

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
					return TASK_PRIORITIES.map((priority) => ({
						header: `${PRIORITY_EMOJI[priority]} ${priority}`,
						items: buckets.get(priority) ?? [],
					}));
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
