import { App } from "obsidian";
import { Project } from "./projects";
import { createFileFromTemplate } from "./utilities";

export async function createNewTask(
	app: App,
	taskName: string,
	selectedProject: Project,
): Promise<void> {
	const filePath = `Projects/${selectedProject.context}/${taskName}.md`;
	// Read file. Create it if it doesn't exist.
	let file = app.vault.getFileByPath(filePath);
	if (!file) {
		await createFileFromTemplate(this.app, filePath, "Task");
		file = app.vault.getFileByPath(filePath);
	}

	// Update the frontmatter value to set a parent project.
	if (file) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["parents"] = [`[[${selectedProject.name}]]`];
		});
	} else {
		console.error(`Task file [${filePath}] does not exist`);
	}
}
