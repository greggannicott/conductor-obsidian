import { App, Notice } from "obsidian";

export const viewInbox = async (app: App): Promise<void> => {
	const file = app.vault.getFiles().find((f) => f.name === "Inbox.base");
	if (!file) {
		new Notice("Inbox.base not found");
		return;
	}
	await app.workspace.getLeaf(false).openFile(file);
};
