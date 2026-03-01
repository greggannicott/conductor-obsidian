import { App } from "obsidian";
import { Project } from "./projects";
import { createFileFromTemplate } from "./utilities";

export async function createNewTask(
	app: App,
	taskName: string,
	selectedProject: Project,
): Promise<void> {
	const uniqueFileName = getUniqueTaskFileName(
		taskName,
		selectedProject.context,
	);
	const filePath = `Projects/${selectedProject.context}/${uniqueFileName}`;

	const file = await createFileFromTemplate(this.app, filePath, "Task");

	// Update the frontmatter value to set a parent project.
	if (file) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["parents"] = [`[[${selectedProject.name}]]`];
		});
	} else {
		console.error(`Task file [${filePath}] does not exist`);
	}
}

function getUniqueTaskFileName(
	taskName: string,
	context: "Work" | "Personal",
): string {
	// TODO: Make sure file name is unique
	// IF the specified file name already exists then append a number.
	// If a number already exists at the end, keep incrementing until it is unique
	const path = `Projects/${context}/${taskName}.md`;
	const uniqueName = taskName;
	return uniqueName;
}
