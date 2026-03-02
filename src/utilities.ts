import { App, TFile } from "obsidian";

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
		console.log("newFilePath", newFilePath);
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
