import { App } from "obsidian";
import {
	ConductorSelectorGrouping,
	ConductorSelectorModal,
} from "./conductor-selector-modal";
import {
	Task,
	TaskPriority,
	TaskStatus,
	TASK_PRIORITIES,
	PRIORITY_EMOJI,
	STATUS_EMOJI,
} from "./tasks";

type GroupMode = "priority" | "status" | "project";
export type ShowTaskSelectorOptions = {
	initialGroupMode?: GroupMode;
	// Which groupings are registered and in what order; the first is the default.
	groupModes?: GroupMode[];
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

export function getTaskText(task: Task): string {
	// A parent link that does not resolve to an existing project note is
	// dropped rather than crashing on its name.
	const parents = task.parents?.filter((p) => p) ?? [];
	if (parents.length == 1) {
		return `${parents[0].name} -> ${task.name}`;
	} else if (parents.length > 1) {
		return `${parents.map((p) => p.name).join(", ")} -> ${task.name}`;
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

	const priorityGrouping: ConductorSelectorGrouping<Task> = {
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
	};

	const statusGrouping: ConductorSelectorGrouping<Task> = {
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
	};

	const projectGrouping: ConductorSelectorGrouping<Task> = {
		id: "project",
		label: "Group by Project",
		toggleKey: "j",
		buildGroups: (items) => {
			const buckets = new Map<string, Task[]>();
			for (const task of items) {
				const parent = task.parents?.[0];
				const header = parent
					? parent.jiraId
						? `${parent.context} -> ${parent.jiraId}: ${parent.name}`
						: `${parent.context} -> ${parent.name}`
					: "Unknown Project";
				if (!buckets.has(header)) buckets.set(header, []);
				buckets.get(header)!.push(task);
			}
			return [...buckets.entries()]
				.sort(([headerA], [headerB]) => headerA.localeCompare(headerB))
				.map(([header, bucket]) => ({ header, items: bucket }));
		},
	};

	// First grouping is always the default; order follows the requested mode.
	const groupingById: Record<GroupMode, ConductorSelectorGrouping<Task>> = {
		priority: priorityGrouping,
		status: statusGrouping,
		project: projectGrouping,
	};
	const modes: GroupMode[] =
		options?.groupModes ??
		(options?.initialGroupMode === "status"
			? ["status", "priority"]
			: ["priority", "status"]);
	const groupings = modes.map((mode) => groupingById[mode]);

	return ConductorSelectorModal.show<Task>(app, {
		items: validTasks,
		placeholder: "Select a task...",
		getText: (task, ctx) =>
			ctx?.activeGrouping === "project" ? task.name : getTaskText(task),
		getSearchText: getTaskText,
		sortItems: byName,
		groupings,
	});
}
