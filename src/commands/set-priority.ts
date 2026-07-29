import { App, Notice, TFile, moment } from "obsidian";
import {
	getTask,
	getActiveTask,
	TaskPriority,
} from "src/tasks";
import { getPriorityDisplay } from "src/utilities";

export const setTaskPriorityForFiles = async (
	app: App,
	files: TFile[],
	priority: TaskPriority,
): Promise<void> => {
	const priorityChangeDt = moment().format("YYYY-MM-DDTHH:mm:ss");
	let updatedCount = 0;
	let lastUpdatedTaskName: string | null = null;

	for (const file of files) {
		const task = getTask(app, file.path);
		if (!task) continue;
		let didChange = false;
		await app.fileManager.processFrontMatter(file, (fm) => {
			if (fm["priority"] !== priority) {
				fm["priority"] = priority;
				fm["meta-last-priority-change-dt"] = priorityChangeDt;
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
			`Task [${lastUpdatedTaskName}] set to [${getPriorityDisplay(priority)}]...`,
		);
	} else {
		new Notice(
			`Priority set to ${getPriorityDisplay(priority)} for ${updatedCount} tasks`,
		);
	}
};

export const setActiveTaskPriority = (
	app: App,
	priority: TaskPriority,
): void => {
	const activeTask = getActiveTask(app);
	if (!activeTask) return;
	void setTaskPriorityForFiles(app, [activeTask.file], priority);
};

export const setTaskPriority = (
	app: App,
	file: TFile,
	priority: TaskPriority,
): void => {
	void setTaskPriorityForFiles(app, [file], priority);
};
