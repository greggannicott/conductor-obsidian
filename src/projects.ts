import { App } from "obsidian";
import { getFilesWithCategory } from "./utilities";

export type Project = {
	name: string;
	path: string;
	context: "Work" | "Personal";
};

// Get a list of projects.
// A project is a file that includes a `categories` value of "[[Project]]"
export function getProjects(app: App): Project[] {
	const projects: Project[] = getFilesWithCategory(app, "Project").map(
		(f) => {
			const context = f.path.startsWith("Projects/Work")
				? "Work"
				: "Personal";
			return {
				name: f.basename,
				path: f.path,
				context,
			};
		},
	);
	return projects;
}
