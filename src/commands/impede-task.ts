import { App, Notice, TFile } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import { getActiveTask } from "src/tasks";
import { isActiveFileTask } from "src/utilities";

export function isTaskImpedeable(app: App): boolean {
	if (!isActiveFileTask(app)) return false;
	const activeFile = app.workspace.activeEditor?.file;
	const isImpeded = Boolean(
		activeFile &&
			app.metadataCache.getFileCache(activeFile)?.frontmatter?.impeded === true,
	);
	return !isImpeded;
}

export function isTaskUnimpedeable(app: App): boolean {
	if (!isActiveFileTask(app)) return false;
	const activeFile = app.workspace.activeEditor?.file;
	const isImpeded = Boolean(
		activeFile &&
			app.metadataCache.getFileCache(activeFile)?.frontmatter?.impeded === true,
	);
	return isImpeded;
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
