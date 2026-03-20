import { App, TFile } from "obsidian";
import { getTask } from "./tasks";
import { Category, getCategory, getFilesWithCategory } from "./utilities";

export type Project = {
	name: string;
	path: string;
	context: Context;
	file: TFile;
};

// export type Context = "Work" | "Personal";
export enum Context {
	Personal = "Personal",
	Work = "Work",
}

// The the project that is currently active.
// A project is active if the focussed file is a project.
export function getActiveProject(app: App): Project | null {
	const activeFile = app.workspace.activeEditor?.file;
	let activeProject!: Project | null;
	if (activeFile) {
		const category = getCategory(app, activeFile);
		switch (category) {
			case Category.Project:
				activeProject = getProjectFromFile(activeFile);
				break;
			case Category.Task:
				activeProject = getProjectFromTask(app, activeFile.path);
				break;
			default:
				break;
		}
	}
	return activeProject;
}

// Get a list of projects.
// A project is a file that includes a `categories` value of "[[Project]]"
export function getProjects(app: App): Project[] {
	const projects: Project[] = getFilesWithCategory(app, "Project").map(
		getProjectFromFile,
	);
	return projects;
}

export function getProjectFromPath(app: App, path: string): Project | null {
	const file = app.vault.getFileByPath(path);
	if (file) {
		return getProjectFromFile(file);
	}
	return null;
}

export function getProjectFromFile(f: TFile): Project {
	const context = f.path.startsWith("Projects/Work")
		? Context.Work
		: Context.Personal;
	return {
		name: f.basename,
		path: f.path,
		context,
		file: f,
	};
}

// Returns the project associated with a task
export function getProjectFromTask(app: App, path: string): Project | null {
	let project!: Project | null;
	const task = getTask(app, path);
	const projectLinkPath = task?.parents[0];
	if (projectLinkPath) {
		const cleanPath = projectLinkPath.replace(/^\[\[|\]\]$/g, "");
		const projectPath = app.metadataCache.getFirstLinkpathDest(
			cleanPath,
			path,
		);
		if (projectPath) {
			project = getProjectFromPath(app, projectPath.path);
		}
	}
	return project;
}
