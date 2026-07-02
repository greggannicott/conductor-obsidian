import { App } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import { ChooseTaskModal } from "src/choose-task.modal";
import {
	getProjects,
	getActiveProject,
	ProjectFilters,
	ProjectStatus,
	outstandingProjectTypes,
} from "src/projects";
import {
	getTasks,
	TaskFilters,
	TaskType,
	TaskStatus,
	outstandingTaskTypes,
} from "src/tasks";

export const openTask = (app: App): void => {
	const selectTaskModal = new ChooseTaskModal(app, {
		initialGroupMode: "status",
	});
	const activeProject = getActiveProject(app);
	let filters: TaskFilters = {
		projectFilter: undefined,
	};
	if (activeProject) {
		filters.projectFilter = {
			projectIs: [activeProject.name],
		};
	}
	selectTaskModal.tasks = getTasks(app, filters);
	selectTaskModal.onChoose = (task) => {
		app.workspace.getLeaf(false).openFile(task.file);
	};
	selectTaskModal.open();
};

export const openInProgressTask = (app: App): void => {
	const selectTaskModal = new ChooseTaskModal(app);
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
	selectTaskModal.tasks = getTasks(app, filters);
	selectTaskModal.onChoose = (task) => {
		app.workspace.getLeaf(false).openFile(task.file);
	};
	selectTaskModal.open();
};

export const openTaskFromAnyProject = (app: App): void => {
	const selectProjectModal = new ChooseProjectModal(app);
	selectProjectModal.projects = getProjects(app);
	selectProjectModal.onChoose = (project) => {
		const selectTaskModal = new ChooseTaskModal(app);
		const filters: TaskFilters = {
			projectFilter: {
				projectIs: [project.name],
			},
		};
		selectTaskModal.tasks = getTasks(app, filters);
		selectTaskModal.onChoose = (task) => {
			app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	};
	selectProjectModal.open();
};

export const openTaskFromAnOutstandingProject = (app: App): void => {
	const projectFilter: ProjectFilters = {
		statusFilter: {
			statusIs: outstandingProjectTypes,
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	const outstandingProjects = getProjects(app, projectFilter);

	const selectTaskModal = new ChooseTaskModal(app);
	const taskFilters: TaskFilters = {
		projectFilter: {
			projectIs: outstandingProjects.map((p) => p.name),
		},
		statusFilter: {
			statusIs: outstandingTaskTypes,
		},
	};

	selectTaskModal.tasks = getTasks(app, taskFilters);

	selectTaskModal.onChoose = (task) => {
		app.workspace.getLeaf(false).openFile(task.file);
	};
	selectTaskModal.open();
};

export const openInProgressTaskFromInProgressProject = (
	app: App,
): void => {
	const projectFilter: ProjectFilters = {
		statusFilter: {
			statusIs: [ProjectStatus.InProgress],
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	const inProgressProjects = getProjects(app, projectFilter);

	const selectTaskModal = new ChooseTaskModal(app, {
		initialGroupMode: "priority",
	});
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
		app.workspace.getLeaf(false).openFile(tasks[0].file);
	} else {
		selectTaskModal.tasks = getTasks(app, taskFilters);

		selectTaskModal.onChoose = (task) => {
			app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	}
};
