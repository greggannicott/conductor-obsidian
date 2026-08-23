import { App } from "obsidian";
import { showProjectSelector } from "src/choose-project-modal";
import { showTaskSelector } from "src/choose-task.modal";
import {
	getProjects,
	getActiveProject,
	ProjectFilters,
	ProjectStatus,
	outstandingProjectTypes,
} from "src/projects";
import {
	getTasks,
	Task,
	TaskFilters,
	TaskType,
	TaskStatus,
	outstandingTaskTypes,
} from "src/tasks";

const openTaskFile = async (app: App, task: Task): Promise<void> => {
	await app.workspace.getLeaf(false).openFile(task.file);
};

export const openTask = async (app: App): Promise<void> => {
	const activeProject = getActiveProject(app);
	let filters: TaskFilters = {
		projectFilter: undefined,
	};
	if (activeProject) {
		filters.projectFilter = {
			projectIs: [activeProject.name],
		};
	}
	const task = await showTaskSelector(app, getTasks(app, filters), {
		initialGroupMode: "status",
	});
	if (!task) return;
	await openTaskFile(app, task);
};

export const openInProgressTask = async (app: App): Promise<void> => {
	const filters: TaskFilters = {
		statusFilter: {
			statusIs: [TaskStatus.InProgress],
		},
		typeFilter: {
			typeExcludes: [TaskType.BlogPost],
		},
		impededFilter: {
			impededIs: false,
		},
	};
	const task = await showTaskSelector(app, getTasks(app, filters));
	if (!task) return;
	await openTaskFile(app, task);
};

export const openTaskFromAnyProject = async (app: App): Promise<void> => {
	const project = await showProjectSelector(app, getProjects(app));
	if (!project) return;

	const task = await showTaskSelector(
		app,
		getTasks(app, {
			projectFilter: {
				projectIs: [project.name],
			},
		}),
	);
	if (!task) return;
	await openTaskFile(app, task);
};

export const openTaskFromAnOutstandingProject = async (
	app: App,
): Promise<void> => {
	const projectFilter: ProjectFilters = {
		statusFilter: {
			statusIs: outstandingProjectTypes,
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	const outstandingProjects = getProjects(app, projectFilter);

	const task = await showTaskSelector(
		app,
		getTasks(app, {
			projectFilter: {
				projectIs: outstandingProjects.map((p) => p.name),
			},
			statusFilter: {
				statusIs: outstandingTaskTypes,
			},
		}),
	);
	if (!task) return;
	await openTaskFile(app, task);
};

export const openInProgressTaskFromInProgressProject = async (
	app: App,
): Promise<void> => {
	const projectFilter: ProjectFilters = {
		statusFilter: {
			statusIs: [ProjectStatus.InProgress],
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	const inProgressProjects = getProjects(app, projectFilter);

	const taskFilters: TaskFilters = {
		projectFilter: {
			projectIs: inProgressProjects.map((p) => p.name),
		},
		statusFilter: {
			statusIs: [TaskStatus.InProgress],
		},
	};

	const tasks = getTasks(app, taskFilters);

	if (tasks.length === 1 && tasks[0]?.file) {
		await openTaskFile(app, tasks[0]);
		return;
	}

	const task = await showTaskSelector(app, tasks, {
		initialGroupMode: "priority",
	});
	if (!task) return;
	await openTaskFile(app, task);
};
