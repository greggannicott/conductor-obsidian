import { App, Notice, TFile } from "obsidian";

import { promptForOptionalEpic } from "src/choose-epic-modal";
import { showProjectSelector } from "src/choose-project-modal";
import { Epic } from "src/epics";
import {
	getProjects,
	Project,
} from "src/projects";
import { createNewTask } from "src/tasks";
import { Category, getCategory, vaultFileExists } from "src/utilities";
import { TextInputModal } from "src/text-input-modal";

export const createTaskFromNote = async (
	app: App,
	targetFile?: TFile,
): Promise<void> => {
	const file = targetFile ?? app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No active note to create a task from.");
		return;
	}

	const blockReason = getCreationBlockReason(app, file);
	if (blockReason) {
		new Notice(blockReason);
		return;
	}

	const project = await showProjectSelector(app, getProjects(app));
	if (!project) {
		new Notice("No project selected.");
		return;
	}

	const epic = await promptForOptionalEpic(app, project.context);

	const { value: name, cancelled } = await TextInputModal.show(app, {
		title: "Task Name",
		placeholder: `Enter task name for project '${project.name}'...`,
		value: file.basename,
	});
	if (cancelled) return;
	const trimmedName = name.trim();
	if (!trimmedName) {
		new Notice("A task name is required.");
		return;
	}

	let task;
	try {
		task = await createNewTask(app, trimmedName, project, "Task", epic);
	} catch (error) {
		console.error(error);
		new Notice(
			`Failed to create task [${trimmedName}]: ${error?.message ?? error}`,
		);
		return;
	}

	if (!task) {
		new Notice(`Failed to create task [${trimmedName}].`);
		return;
	}

	const content = await app.vault.read(task.file);
	if (!content.includes(`[[${file.basename}]]`)) {
		await app.vault.modify(
			task.file,
			`${content.trimEnd()}\n\nSource: [[${file.basename}]]\n`,
		);
	}

	const originalContent = await app.vault.read(file);
	await app.vault.modify(
		file,
		`${originalContent.trimEnd()}\n\nTask: [[${task.name}]]\n`,
	);

	await app.workspace.getLeaf(false).openFile(task.file);

	new Notice(
		`Created task [${task.name}] from [${file.basename}] in project [${project.name}].`,
	);
};

export const isNoteTaskCreatable = (app: App, file: TFile): boolean => {
	return getCreationBlockReason(app, file) === null;
};

const getCreationBlockReason = (app: App, file: TFile): string | null => {
	if (file.extension !== "md") {
		return `[${file.name}] is not a markdown note.`;
	}
	if (file.path.startsWith("_templates/")) {
		return "Templates cannot be used to create tasks.";
	}
	const category = getCategory(app, file);
	if (category === Category.Task) {
		return `[${file.name}] is already a task.`;
	}
	if (category === Category.Project) {
		return `[${file.name}] is a project and cannot be used to create a task.`;
	}
	return null;
};