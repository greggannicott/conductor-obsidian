import { App } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import {
	getProjects,
	getActiveProject,
	ProjectFilters,
	ProjectStatus,
} from "src/projects";

export const openProject = (app: App): void => {
	const selectProjectModal = new ChooseProjectModal(app);
	selectProjectModal.projects = getProjects(app);
	selectProjectModal.onChoose = (project) => {
		app.workspace.getLeaf(false).openFile(project.file);
	};
	selectProjectModal.open();
};

export const openOutstandingProject = (app: App): void => {
	const selectProjectModal = new ChooseProjectModal(app);
	const filter: ProjectFilters = {
		statusFilter: {
			statusIs: [ProjectStatus.ToDo, ProjectStatus.InProgress],
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	selectProjectModal.projects = getProjects(app, filter);
	selectProjectModal.onChoose = (project) => {
		app.workspace.getLeaf(false).openFile(project.file);
	};
	selectProjectModal.open();
};

export const openParentProject = (app: App): void => {
	const activeProject = getActiveProject(app);
	if (activeProject) {
		app.workspace.getLeaf(false).openFile(activeProject.file);
	}
};
