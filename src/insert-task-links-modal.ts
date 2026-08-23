import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	Task,
	getTasks,
	TaskPriority,
	TaskStatus,
	TaskType,
	TASK_PRIORITIES,
	PRIORITY_EMOJI,
	STATUS_EMOJI,
} from "./tasks";
import { Context, getProjects, outstandingProjectTypes } from "./projects";

const contextOrder: Record<string, number> = {
	[Context.Work]: 0,
	[Context.Personal]: 1,
};

const projectNameForTask = (task: Task): string =>
	task.parents?.[0]?.name || "Uncategorized";

// Work tasks before Personal, then priority, then name. Applied globally so
// grouped views inherit both the header order and the within-group order.
const compareTasks = (a: Task, b: Task): number => {
	const ca = contextOrder[a.parents?.[0]?.context ?? ""] ?? 2;
	const cb = contextOrder[b.parents?.[0]?.context ?? ""] ?? 2;
	if (ca !== cb) return ca - cb;
	const pa = TASK_PRIORITIES.indexOf(a.priority);
	const pb = TASK_PRIORITIES.indexOf(b.priority);
	if (pa !== pb) return (pa === -1 ? TASK_PRIORITIES.length : pa) -
		(pb === -1 ? TASK_PRIORITIES.length : pb);
	return a.name.localeCompare(b.name);
};

export function showOutstandingTasksSelector(app: App): Promise<Task[]> {
	const allTasks = getTasks(app, {
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

	const allProjects = getProjects(app);
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

	const outstandingTasks = validTasks.filter((t) => {
		const parentName = t.parents?.[0]?.name;
		return parentName && outstandingProjectNames.has(parentName);
	});

	return ConductorSelectorModal.showMulti<Task>(app, {
		items: outstandingTasks,
		placeholder: "Filter tasks by name or project...",
		emptyText: "No outstanding tasks",
		getText: (task) => task.name,
		getSearchText: (task) => `${projectNameForTask(task)} ${task.name}`,
		getBadges: (task) =>
			[
				PRIORITY_EMOJI[task.priority as TaskPriority],
				STATUS_EMOJI[task.status],
			].filter((badge): badge is string => Boolean(badge)),
		sortItems: compareTasks,
		groupings: [
			{
				id: "project",
				label: "By Project",
				buildGroups: (tasks) => {
					const buckets = new Map<
						string,
						{ context: Context | null; tasks: Task[] }
					>();
					for (const task of tasks) {
						const parent = task.parents?.[0];
						const projectName = projectNameForTask(task);
						if (!buckets.has(projectName)) {
							buckets.set(projectName, {
								context: parent?.context ?? null,
								tasks: [],
							});
						}
						buckets.get(projectName)!.tasks.push(task);
					}
					return [...buckets.entries()]
						.sort(([nameA, a], [nameB, b]) => {
							const ca = contextOrder[a.context ?? ""] ?? 2;
							const cb = contextOrder[b.context ?? ""] ?? 2;
							if (ca !== cb) return ca - cb;
							return nameA.localeCompare(nameB);
						})
						.map(([projectName, { tasks: bucket }]) => ({
							header: projectName,
							items: bucket,
						}));
				},
			},
		],
	});
}
