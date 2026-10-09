import { App, TFile, parseFrontMatterStringArray } from "obsidian";

export type Problem = {
	name: string;
	path: string;
	file: TFile;
};

export function getProblems(app: App): Problem[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => isNoteProblem(app, file))
		// Only active problems are offered, matching the Problems base and
		// Note Navigator views, which filter on problem-status == "Active".
		.filter((file) => getProblemStatus(app, file) === "Active")
		.map((file) => ({
			name: file.basename,
			path: file.path,
			file,
		}));
}

export function isNoteProblem(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const categories = parseFrontMatterStringArray(frontmatter, "categories");
	return categories?.includes("[[Problem]]") ?? false;
}

function getProblemStatus(app: App, file: TFile): string | null {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const status = frontmatter?.["problem-status"];
	return typeof status === "string" ? status : null;
}
