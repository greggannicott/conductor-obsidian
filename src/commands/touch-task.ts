import { App, Notice, TFile, moment } from "obsidian";
import { getTask, getActiveTask } from "src/tasks";

export const touchTask = async (app: App): Promise<void> => {
	const activeTask = getActiveTask(app);
	if (!activeTask) {
		new Notice("No active task found");
		return;
	}
	await touchTaskFiles(app, [activeTask.file]);
};

export const touchTaskFiles = async (
	app: App,
	files: TFile[],
): Promise<void> => {
	const touchedDt = moment().format("YYYY-MM-DDTHH:mm:ss");
	let updatedCount = 0;
	let lastUpdatedTaskName: string | null = null;

	for (const file of files) {
		const task = getTask(app, file.path);
		if (!task) continue;

		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["meta-last-priority-change-dt"] = touchedDt;
			fm["meta-last-status-change-dt"] = touchedDt;
		});
		updatedCount++;
		lastUpdatedTaskName = task.name;
	}

	if (updatedCount === 0) return;
	if (updatedCount === 1 && lastUpdatedTaskName) {
		new Notice(`Task [${lastUpdatedTaskName}] touched...`);
	} else {
		new Notice(`Touched ${updatedCount} tasks`);
	}
};
