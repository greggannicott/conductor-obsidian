import { App, Notice, TFile } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import { getActiveTask } from "src/tasks";

export function isTaskImpedeable(app: App): boolean {
	const activeFile = app.workspace.activeEditor?.file;
	if (!activeFile) return false;
	const metadata = app.metadataCache.getFileCache(activeFile);
	const categories = metadata?.frontmatter?.categories;
	const isTask =
		categories &&
		Array.isArray(categories) &&
		categories.includes("[[Task]]");
	if (!isTask) return false;
	const isImpeded = metadata?.frontmatter?.impeded === true;
	if (isImpeded) return false;
	return true;
}

export function isTaskUnimpedeable(app: App): boolean {
	const activeFile = app.workspace.activeEditor?.file;
	if (!activeFile) return false;
	const metadata = app.metadataCache.getFileCache(activeFile);
	const categories = metadata?.frontmatter?.categories;
	const isTask =
		categories &&
		Array.isArray(categories) &&
		categories.includes("[[Task]]");
	if (!isTask) return false;
	const isImpeded = metadata?.frontmatter?.impeded === true;
	if (!isImpeded) return false;
	return true;
}

export async function impedeActiveTask(app: App): Promise<void> {
	const activeTask = getActiveTask(app);
	if (!activeTask) return;

	const { value: reason } = await TextInputModal.show(app, {
		title: "Impeded Reason",
		placeholder: "Why is this task impeded?",
	});

	await app.fileManager.processFrontMatter(activeTask.file, (fm) => {
		fm["impeded"] = true;
		fm["impeded-reason"] = reason?.trim() ?? "";
	});

	new Notice(`Task [${activeTask.name}] impeded...`);
}

export async function unimpeadeActiveTask(app: App): Promise<void> {
	const activeTask = getActiveTask(app);
	if (!activeTask) return;

	await app.fileManager.processFrontMatter(activeTask.file, (fm) => {
		fm["impeded"] = false;
		fm["impeded-reason"] = "";
	});

	new Notice(`Task [${activeTask.name}] unimpeded...`);
}
