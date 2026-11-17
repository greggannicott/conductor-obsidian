import { App, Notice, TFile } from "obsidian";
import { getTask, getActiveTask } from "src/tasks";
import { getSizeDisplay } from "src/utilities";

export const setTaskSizeForFiles = async (
	app: App,
	files: TFile[],
	size: number,
): Promise<void> => {
	let updatedCount = 0;
	let lastUpdatedTaskName: string | null = null;

	for (const file of files) {
		const task = getTask(app, file.path);
		if (!task) continue;
		let didChange = false;
		await app.fileManager.processFrontMatter(file, (fm) => {
			if (fm["size"] !== size) {
				fm["size"] = size;
				didChange = true;
			}
		});
		if (!didChange) continue;

		updatedCount++;
		lastUpdatedTaskName = task.name;
	}

	if (updatedCount === 0) return;

	if (updatedCount === 1 && lastUpdatedTaskName) {
		new Notice(
			`Task [${lastUpdatedTaskName}] set to [${getSizeDisplay(size)}]...`,
		);
	} else {
		new Notice(
			`Size set to ${getSizeDisplay(size)} for ${updatedCount} tasks`,
		);
	}
};

export const setActiveTaskSize = (app: App, size: number): void => {
	const activeTask = getActiveTask(app);
	if (!activeTask) return;
	void setTaskSizeForFiles(app, [activeTask.file], size);
};

export const setTaskSize = (app: App, file: TFile, size: number): void => {
	void setTaskSizeForFiles(app, [file], size);
};
