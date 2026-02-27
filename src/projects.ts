import { App } from "obsidian";

export type Project = {
	name: string;
	path: string;
	context: "Work" | "Personal";
};

// Get a list of projects.
// A project is a file that includes a `categories` value of "[[Project]]"
export function getProjects(app: App): Project[] {
	const files = app.vault.getMarkdownFiles();
	const filesInProjectFolder = files.filter(
		(f) =>
			f.path.startsWith("Projects/Personal") ||
			f.path.startsWith("Projects/Work"),
	);
	const projects: Project[] = filesInProjectFolder
		.filter((f) => {
			const frontmatter = app.metadataCache.getFileCache(f)?.frontmatter;
			return frontmatter?.categories?.contains("[[Project]]");
		})
		.map((f) => {
			const context = f.path.startsWith("Projects/Work") ? "Work" : "Personal";
			return {
				name: f.basename,
				path: f.path,
				context,
			};
		});
	return projects;
}
