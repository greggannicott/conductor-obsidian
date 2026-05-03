import { App, TFile } from "obsidian";
import { getTask } from "./tasks";
import { Category, getCategory, getFilesWithCategory } from "./utilities";

export type Project = {
	name: string;
	path: string;
	context: Context;
	file: TFile;
	parents: Project[];
	jiraId: string;
	branch: string;
	ongoing: boolean;
	status: ProjectStatus;
	projectId: string;
	repoDirectoryName: string;
};

export type ProjectFilters = {
	statusFilter?: StatusFilter;
	ongoingFilter?: OngoingFilter;
};

type StatusFilter = {
	statusIs: ProjectStatus[];
};

type OngoingFilter = {
	ongoingIs: boolean;
};

export enum Context {
	Personal = "Personal",
	Work = "Work",
}

export enum ProjectStatus {
	ToDo = "01 - To Do",
	InProgress = "02 - In Progress",
	Done = "03 - Done",
	Abandoned = "04 - Abandoned",
}

export const outstandingProjectTypes: ProjectStatus[] = [
	ProjectStatus.ToDo,
	ProjectStatus.InProgress,
];

// The the project that is currently active.
// A project is active if the focussed file is a project, or if a task belonging to the project.
export function getActiveProject(app: App): Project | null {
	const activeFile = app.workspace.activeEditor?.file;
	let activeProject!: Project | null;
	if (activeFile) {
		const category = getCategory(app, activeFile);
		switch (category) {
			case Category.Project:
				activeProject = getProjectFromFile(app, activeFile);
				break;
			case Category.Task:
				const task = getTask(app, activeFile.path);
				if (task?.parents[0]) {
					activeProject = task.parents[0];
				}
				break;
			default:
				break;
		}
	}
	return activeProject;
}

// Get the Jira ID of the currently active project
export function getActiveProjectJiraId(app: App): string | null {
	const activeProject = getActiveProject(app);
	if (!activeProject?.jiraId) {
		return null;
	}
	return activeProject.jiraId;
}

// Get a list of projects.
// A project is a file that includes a `categories` value of "[[Project]]"
export function getProjects(app: App, filter?: ProjectFilters): Project[] {
	let projects: Project[] = getFilesWithCategory(app, "Project").map((f) => {
		return getProjectFromFile(app, f);
	});
	if (filter) {
		if (filter.statusFilter) {
			projects = projects.filter((p) =>
				filter.statusFilter?.statusIs?.includes(p.status),
			);
		}
		if (filter.ongoingFilter) {
			projects = projects.filter(
				(p) => p.ongoing === filter.ongoingFilter?.ongoingIs,
			);
		}
	}
	return projects;
}

export function getProjectFromPath(app: App, path: string): Project | null {
	const file = app.vault.getFileByPath(path);
	if (file) {
		return getProjectFromFile(app, file);
	}
	return null;
}

export function getProjectFromFile(app: App, f: TFile): Project {
	const frontmatter = app.metadataCache.getFileCache(f)?.frontmatter;
	const context = f.path.startsWith("Projects/Work")
		? Context.Work
		: Context.Personal;
	const parents =
		frontmatter &&
		frontmatter["parents"]?.map((link: string) => {
			return getProjectFromLink(app, link, f.path);
		});
	const jiraId = frontmatter && frontmatter["jira-id"];
	const branch = frontmatter && frontmatter["branch"];
	const ongoing =
		frontmatter && frontmatter["ongoing"] === true ? true : false;
	const status = frontmatter && frontmatter["status"];
	const projectId = frontmatter && frontmatter["project-id"];
	const repoDirectoryName = frontmatter && frontmatter["repo-directory-name"];
	return {
		name: f.basename,
		path: f.path,
		context,
		file: f,
		parents,
		jiraId,
		branch,
		ongoing,
		status,
		projectId,
		repoDirectoryName,
	};
}

export function getProjectFromLink(
	app: App,
	link: string,
	path: string,
): Project | null {
	let project!: Project | null;
	const cleanPath = link.replace(/^\[\[|\]\]$/g, "");
	const projectPath = app.metadataCache.getFirstLinkpathDest(cleanPath, path);
	if (projectPath) {
		project = getProjectFromPath(app, projectPath.path);
	}
	return project;
}

export async function updateProject(app: App, project: Project): Promise<void> {
	const file = app.vault.getFileByPath(project.path);
	if (file) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["status"] = project.status;
			fm["jira-id"] = project.jiraId;
			fm["branch"] = project.branch;
			fm["ongoing"] = project.ongoing;
			fm["project-id"] = project.projectId;
			fm["repo-directory-name"] = project.repoDirectoryName;
		});
	}
}
