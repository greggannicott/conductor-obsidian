import { App } from "obsidian";

// Get a list of projects.
// A project is a file that includes a `categories` value of "[[Project]]"
export function getProjects(app: App) {
	const files = app.vault.getMarkdownFiles();
	const filesInProjectFolder = files.filter(
		(f) =>
			f.path.startsWith("Projects/Personal") ||
			f.path.startsWith("Projects/Work"),
	);
	const projects = filesInProjectFolder.filter((f) => {
		const frontmatter = app.metadataCache.getFileCache(f)?.frontmatter;
		return frontmatter?.categories?.contains("[[Project]]");
	});
	return projects;
}
