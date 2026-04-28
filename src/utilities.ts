import { App, TFile } from "obsidian";

export const enum Category {
	Unknown,
	Project,
	Task,
}

export async function createFileFromTemplate(
	app: App,
	newFilePath: string,
	templateName: string,
): Promise<TFile | null> {
	const templatesFolder = "_templates";
	const template = app.vault.getFileByPath(
		`${templatesFolder}/${templateName}.md`,
	);
	if (template) {
		const content = await app.vault.read(template);
		await app.vault.create(newFilePath, content);
		return app.vault.getFileByPath(newFilePath);
	} else {
		console.error(
			`Unable to create file template. Unknown template [${templateName}]`,
		);
		return null;
	}
}

export function vaultFileExists(app: App, path: string): boolean {
	const file = app.vault.getFileByPath(path);
	return file !== null;
}

export function getFilesWithCategory(app: App, category: string): TFile[] {
	const files = app.vault.getMarkdownFiles();
	const filesInProjectFolder = files.filter(
		(f) =>
			f.path.startsWith("Projects/Personal") ||
			f.path.startsWith("Projects/Work"),
	);
	return filesInProjectFolder.filter((f) => {
		const frontmatter = app.metadataCache.getFileCache(f)?.frontmatter;
		return frontmatter?.categories?.contains(`[[${category}]]`);
	});
}

export function getCategory(app: App, file: TFile): Category {
	const categories: string[] = app.metadataCache.getCache(file.path)
		?.frontmatter?.categories;

	if (categories?.includes("[[Project]]")) {
		return Category.Project;
	} else if (categories?.includes("[[Task]]")) {
		return Category.Task;
	} else {
		return Category.Unknown;
	}
}

/**
 * Helper function to process tags in frontmatter.
 * Ensures tags property exists and is an array.
 * @param app - The Obsidian App instance
 * @param file - The TFile to modify
 * @param processCallback - Callback function that modifies the tags array
 */
async function processTagsInFrontmatter(
	app: App,
	file: TFile,
	processCallback: (tags: string[]) => void,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		// Initialize tags array if it doesn't exist
		if (!frontmatter.tags) {
			frontmatter.tags = [];
		}

		// Ensure tags is an array
		if (!Array.isArray(frontmatter.tags)) {
			frontmatter.tags = [frontmatter.tags];
		}

		// Execute the specific tag operation
		processCallback(frontmatter.tags);
	});
}

/**
 * Toggles a tag in the file's frontmatter.
 * If the tag exists, it will be removed. If it doesn't exist, it will be added.
 * Creates frontmatter if it doesn't exist.
 * @param app - The Obsidian App instance
 * @param file - The TFile to modify
 * @param tagName - Tag name without the # symbol (e.g., "inbox")
 */
export async function toggleTag(
	app: App,
	file: TFile,
	tagName: string,
): Promise<void> {
	await processTagsInFrontmatter(app, file, (tags) => {
		const tagIndex = tags.indexOf(tagName);
		if (tagIndex !== -1) {
			tags.splice(tagIndex, 1);
		} else {
			tags.push(tagName);
		}
	});
}

/**
 * Adds a tag to the file's frontmatter.
 * If the tag already exists, no action is taken.
 * Creates frontmatter if it doesn't exist.
 * @param app - The Obsidian App instance
 * @param file - The TFile to modify
 * @param tagName - Tag name without the # symbol (e.g., "inbox")
 */
export async function addTag(
	app: App,
	file: TFile,
	tagName: string,
): Promise<void> {
	await processTagsInFrontmatter(app, file, (tags) => {
		if (!tags.includes(tagName)) {
			tags.push(tagName);
		}
	});
}

/**
 * Removes a tag from the file's frontmatter.
 * If the tag doesn't exist, no action is taken.
 * Creates frontmatter if it doesn't exist.
 * @param app - The Obsidian App instance
 * @param file - The TFile to modify
 * @param tagName - Tag name without the # symbol (e.g., "inbox")
 */
export async function removeTag(
	app: App,
	file: TFile,
	tagName: string,
): Promise<void> {
	await processTagsInFrontmatter(app, file, (tags) => {
		const tagIndex = tags.indexOf(tagName);
		if (tagIndex !== -1) {
			tags.splice(tagIndex, 1);
		}
	});
}
