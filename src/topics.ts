import { App, TFile, parseFrontMatterStringArray } from "obsidian";

export type Topic = {
	name: string;
	path: string;
	file: TFile;
};

export function getTopics(app: App): Topic[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => isTopicFile(app, file))
		.map((file) => ({
			name: file.basename,
			path: file.path,
			file,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function getNotesForTopic(app: App, topic: Topic): TFile[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => {
			if (file.path.startsWith("_templates/")) return false;
			const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
			const topics = parseFrontMatterStringArray(frontmatter, "topics");
			if (!topics || topics.length === 0) return false;
			return topics.some((link) =>
				linkResolvesToFile(app, link, file.path, topic.path),
			);
		})
		.sort((a, b) => a.basename.localeCompare(b.basename));
}

export function getTopicNamesForNote(app: App, file: TFile): string[] {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const topics = parseFrontMatterStringArray(frontmatter, "topics");
	if (!topics || topics.length === 0) return [];
	return topics
		.map((link) => link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim())
		.filter((name) => name.length > 0);
}

function isTopicFile(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const tags = parseFrontMatterStringArray(frontmatter, "tags");
	return tags?.includes("topic") ?? false;
}

function linkResolvesToFile(
	app: App,
	link: string,
	sourcePath: string,
	targetPath: string,
): boolean {
	const cleanPath = link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
	if (!cleanPath) return false;
	const dest = app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);
	return dest?.path === targetPath;
}
