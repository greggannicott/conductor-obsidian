import { App } from "obsidian";
import { showProjectSelector } from "src/choose-project-modal";
import {
	getProjects,
	getActiveProject,
	ProjectFilters,
	ProjectStatus,
} from "src/projects";

export const openProject = async (app: App): Promise<void> => {
	const project = await showProjectSelector(app, getProjects(app));
	if (!project) return;
	await app.workspace.getLeaf(false).openFile(project.file);
};

export const openOutstandingProject = async (app: App): Promise<void> => {
	const filter: ProjectFilters = {
		statusFilter: {
			statusIs: [ProjectStatus.ToDo, ProjectStatus.InProgress],
		},
		ongoingFilter: {
			ongoingIs: false,
		},
	};
	const project = await showProjectSelector(app, getProjects(app, filter));
	if (!project) return;
	await app.workspace.getLeaf(false).openFile(project.file);
};

export const openParentProject = (app: App): void => {
	const activeProject = getActiveProject(app);
	if (activeProject) {
		app.workspace.getLeaf(false).openFile(activeProject.file);
	}
};
