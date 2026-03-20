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
