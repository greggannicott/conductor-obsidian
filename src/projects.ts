import { App, TFile } from "obsidian";
import { Category, getCategory, getFilesWithCategory } from "./utilities";

export type Project = {
	name: string;
	path: string;
	context: Context;
	file: TFile;
};

export type Context = "Work" | "Personal";

// The the project that is currently active.
// A project is active if the focussed file is a project.
export function getActiveProject(app: App): Project {
	const activeFile = app.workspace.activeEditor?.file;
	let activeProject!: Project;
	if (activeFile) {
		const category = getCategory(app, activeFile);
		switch (category) {
			case Category.Project:
				activeProject = getProjectFromFile(activeFile);
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

export function getProjectFromFile(f: TFile): Project {
	const context = f.path.startsWith("Projects/Work") ? "Work" : "Personal";
	return {
		name: f.basename,
		path: f.path,
		context,
		file: f,
	};
}
