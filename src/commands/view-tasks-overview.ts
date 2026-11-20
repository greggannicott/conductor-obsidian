import { App, Notice } from "obsidian";

export const viewTasksOverview = async (app: App): Promise<void> => {
	const file = app.vault.getFiles().find((f) => f.name === "Tasks.base");
	if (!file) {
		new Notice("Tasks.base not found");
		return;
	}
	await app.workspace.getLeaf(false).openFile(file);
};
