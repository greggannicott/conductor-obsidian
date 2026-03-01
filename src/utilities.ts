import { App } from "obsidian";

export async function createFileFromTemplate(
	app: App,
	newFilePath: string,
	templateName: string,
): Promise<void> {
	const templatesFolder = "_templates";
	const template = app.vault.getFileByPath(
		`${templatesFolder}/${templateName}.md`,
	);
	if (template) {
		const content = await app.vault.read(template);
		await app.vault.create(newFilePath, content);
	} else {
		console.error(
			`Unable to create file template. Unknown template [${templateName}]`,
		);
	}
}
