import { App, TFile, parseFrontMatterStringArray } from "obsidian";

export type ExperimentKind = "short" | "long" | "other";

export type Experiment = {
	name: string;
	path: string;
	file: TFile;
	kind: ExperimentKind;
};

export function getExperiments(app: App): Experiment[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => isNoteExperiment(app, file))
		.map((file) => ({
			name: file.basename,
			path: file.path,
			file,
			kind: getExperimentKind(app, file),
		}));
}

export function isNoteExperiment(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const categories = parseFrontMatterStringArray(frontmatter, "categories");
	return categories?.includes("[[Experiment]]") ?? false;
}

function getExperimentKind(app: App, file: TFile): ExperimentKind {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const types = parseFrontMatterStringArray(frontmatter, "type") ?? [];
	for (const link of types) {
		const value = link
			.replace(/^\[\[|\]\]$/g, "")
			.split("|")[0]
			.trim();
		if (value === "Short Experiment") return "short";
		if (value === "Long Experiment") return "long";
	}
	return "other";
}
