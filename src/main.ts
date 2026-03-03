import { Notice, Plugin, TFile } from "obsidian";

import { ChooseProjectModal } from "src/choose-project-modal";
import { ConfirmationKeybinding, TextInputModal } from "src/text-input-modal";
import { getProjects, Project } from "src/projects";
import { createFileFromTemplate } from "./utilities";
import { createNewTask, getTasks, Task } from "./tasks";
import { ChooseTaskModal } from "./choose-task.modal";

interface ConductorSettings {
	taskId: number;
	projectId: number;
}

const DEFAULT_SETTINGS: ConductorSettings = {
	taskId: 0,
	projectId: 0,
};

export default class ConductorObsidian extends Plugin {
	settings: ConductorSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "insert-task",
			name: "Insert New Task",
			hotkeys: [{ modifiers: ["Ctrl"], key: "t" }],
			editorCallback: async (editor, _) => {
				await this.loadSettings();
				// Set new task ID
				this.settings.taskId++;
				const taskId = `TSK-${this.settings.taskId}`;

				// Build line
				let taskText = `- [[${taskId} - ]]`;

				// Insert Task
				const { line } = editor.getCursor();
				editor.setLine(line, taskText);

				// Move cursor so you can write the task name immediately
				const lineLength = editor.getLine(line).length;
				const taskNameInsertPosition = lineLength - 2;
				const newCursorPosition = { line, ch: taskNameInsertPosition };
				editor.setCursor(newCursorPosition);

				// Save new ID
				this.saveSettings();
			},
		});

		this.addCommand({
			id: "open-project",
			name: "Open Project",
			callback: async () => {
				const selectProjectModal = new ChooseProjectModal(this.app);
				selectProjectModal.projects = getProjects(this.app);
				selectProjectModal.onChoose = async (project: Project) => {
					this.app.workspace.getLeaf(false).openFile(project.file);
				};
				selectProjectModal.open();
			},
		});

		this.addCommand({
			id: "open-task",
			name: "Open Task",
			callback: async () => {
				const selectTaskModal = new ChooseTaskModal(this.app);
				selectTaskModal.tasks = getTasks(this.app);
				selectTaskModal.onChoose = async (task: Task) => {
					this.app.workspace.getLeaf(false).openFile(task.file);
				};
				selectTaskModal.open();
			},
		});

		this.addCommand({
			id: "create-new-task",
			name: "Create New Task",
			callback: async () => {
				// Obtain a list of possible projects
				const projects = getProjects(this.app);

				// Display a modal to obtain the chosen project
				const selectProjectModal = new ChooseProjectModal(this.app);
				selectProjectModal.projects = projects;

				selectProjectModal.onChoose = async (
					selectedProject: Project,
				) => {
					const { value: name, submitKeybinding } =
						await TextInputModal.show(this.app, {
							title: "Task Name",
							placeholder: "Enter task name...",
						});
					const task = await createNewTask(
						this.app,
						name,
						selectedProject,
					);
					if (task) {
						new Notice(`New task [${name}] created...`);
						switch (submitKeybinding) {
							case ConfirmationKeybinding.Enter:
								this.app.workspace
									.getLeaf(false)
									.openFile(task.file);
								break;
							case ConfirmationKeybinding.ShiftEnter:
								// Don't display the file
								break;
							default:
								console.error(
									`Unknown ConfirmationKeybinding type [${submitKeybinding}]`,
								);
								break;
						}
					}
				};

				selectProjectModal.open();
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
