import { App, Notice } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import { TextInputModal, TextInputKeybinding } from "src/text-input-modal";
import { getProjects, getActiveProject, Project } from "src/projects";
import {
	createNewTask,
	getTaskCreationDetails,
	TaskStatus,
} from "src/tasks";

export const showCreateTaskFlow = async (app: App): Promise<void> => {
	const activeProject = getActiveProject(app);

	if (activeProject) {
		await displayTaskNameInput(app, activeProject);
	} else {
		const projects = getProjects(app);
		const selectProjectModal = new ChooseProjectModal(app);
		selectProjectModal.projects = projects;
		selectProjectModal.onChoose = (project: Project) => {
			void displayTaskNameInput(app, project);
		};
		selectProjectModal.open();
	}
};

export const showCreateTaskForAnyProjectFlow = async (
	app: App,
): Promise<void> => {
	const projects = getProjects(app);
	const selectProjectModal = new ChooseProjectModal(app);
	selectProjectModal.projects = projects;
	selectProjectModal.onChoose = (project: Project) => {
		void displayTaskNameInput(app, project);
	};
	selectProjectModal.open();
};

async function displayTaskNameInput(
	app: App,
	selectedProject: Project,
): Promise<void> {
	const keybindings: TextInputKeybinding[] = [
		{
			id: "shift-enter",
			commandText: "shift+↵",
			check: (e) => e.shiftKey && e.key === "Enter",
			instruction: "create task in background",
		},
		{
			id: "enter",
			commandText: "↵",
			check: (e) => e.key === "Enter",
			instruction: "create task",
		},
	];
	const { value: name, submitKeybinding } = await TextInputModal.show(app, {
		title: "Task Name",
		placeholder: `Enter task name for project '${selectedProject.name}'...`,
		keybindings,
	});
	const { templateName, answer } = await getTaskCreationDetails(app, name);
	const task = await createNewTask(
		app,
		name,
		selectedProject,
		templateName,
	);
	if (task) {
		await applyQuestionAnswerToTaskIfProvided(app, task.file, answer);
		new Notice(`New task [${task.name}] created...`);
		switch (submitKeybinding) {
			case "enter":
				app.workspace.getLeaf(false).openFile(task.file);
				break;
			case "shift-enter":
				break;
			default:
				console.error(
					`Unknown ConfirmationKeybinding type [${submitKeybinding}]`,
				);
				break;
		}
	}
}

async function applyQuestionAnswerToTaskIfProvided(
	app: App,
	taskFile: Parameters<App["vault"]["read"]>[0],
	answer: string | null,
): Promise<void> {
	if (!answer) return;

	await app.fileManager.processFrontMatter(taskFile, (fm) => {
		fm["answer"] = answer;
		fm["status"] = TaskStatus.Done;
	});
}
