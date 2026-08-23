import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Task, getTasks, TaskPriority, TaskStatus, TaskType } from "./tasks";
import { Context, getProjects, outstandingProjectTypes } from "./projects";

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

const projectNameForTask = (task: Task): string =>
	task.parents?.[0]?.name || "Uncategorized";

// Work tasks before Personal, then priority, then name. Applied globally so
// grouped views inherit both the header order and the within-group order.
const compareTasks = (a: Task, b: Task): number => {
	const ca = contextOrder[a.parents?.[0]?.context ?? ""] ?? 2;
	const cb = contextOrder[b.parents?.[0]?.context ?? ""] ?? 2;
	if (ca !== cb) return ca - cb;
	const pa = priorityOrder[a.priority] ?? 2;
	const pb = priorityOrder[b.priority] ?? 2;
	if (pa !== pb) return pa - pb;
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
			[priorityEmoji[task.priority], statusEmoji[task.status]].filter(
				(badge): badge is string => Boolean(badge),
			),
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
