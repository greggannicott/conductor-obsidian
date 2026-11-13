import { App, Notice, TFile, moment } from "obsidian";
import { showTaskSelector } from "src/choose-task.modal";
import { getActiveProject } from "src/projects";
import {
	getTasks,
	Task,
	TaskFilters,
	TaskStatus,
	isQuestionTask,
	taskHasAnswer,
} from "src/tasks";
import { TextInputModal } from "src/text-input-modal";

export const answerQuestion = async (app: App): Promise<void> => {
	const activeProject = getActiveProject(app);

	const filters: TaskFilters = {};
	if (activeProject) {
		filters.projectFilter = {
			projectIs: [activeProject.name],
		};
	}

	const tasks = getTasks(app, filters).filter(
		(task): task is Task =>
			task !== null &&
			isQuestionTask(task) &&
			!taskHasAnswer(app, task.file),
	);

	if (tasks.length === 0) {
		new Notice("No unanswered questions found");
		return;
	}

	const selected = await showTaskSelector(app, tasks, {
		omitProjectName: Boolean(activeProject),
		placeholder: "Select a question...",
		groupModes: activeProject
			? ["priority", "status"]
			: ["project", "priority"],
	});
	if (!selected) return;

	const prompt = await TextInputModal.show(app, {
		title: "Answer",
		placeholder: "Provide an answer...",
	});
	if (prompt.cancelled) return;

	const answer = prompt.value.trim();
	if (!answer) {
		new Notice("No answer provided");
		return;
	}

	const statusChangeDt = moment().format("YYYY-MM-DDTHH:mm:ss");
	await app.fileManager.processFrontMatter(selected.file, (fm) => {
		fm["answer"] = answer;
		fm["status"] = TaskStatus.Done;
		fm["meta-last-status-change-dt"] = statusChangeDt;
	});

	new Notice(`Answered "${selected.name}" and set to Done`);
};
