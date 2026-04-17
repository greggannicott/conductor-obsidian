import { Notice, Plugin } from "obsidian";

import { ChooseProjectModal } from "src/choose-project-modal";
import { TextInputKeybinding, TextInputModal } from "src/text-input-modal";
import { getActiveProject, getProjects, Project } from "src/projects";
import {
	createNewTask,
	getTasks,
	Task,
	getTaskOptions,
	TaskStatus,
	getActiveTask,
	updateTask,
	TaskPriority,
} from "./tasks";
import { ChooseTaskModal } from "./choose-task.modal";

interface ConductorSettings {}

const DEFAULT_SETTINGS: ConductorSettings = {};

export default class ConductorObsidian extends Plugin {
	settings: ConductorSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "open-project",
			name: "Open Project",
			callback: this.openProject,
		});

		this.addCommand({
			id: "open-task",
			name: "Open Task",
			callback: this.openTask,
		});

		this.addCommand({
			id: "open-task-from-any-project",
			name: "Open Task From Any Project",
			callback: this.openTaskFromAnyProject,
		});

		this.addCommand({
			id: "open-parent",
			name: "Open Parent Project",
			callback: this.openParentProject,
		});

		this.addCommand({
			id: "create-new-task",
			name: "Create New Task",
			callback: this.createNewTask,
		});

		this.addCommand({
			id: "create-new-task-for-any-project",
			name: "Create New Task For Any Project",
			callback: this.createNewTaskForAnyProject,
		});

		this.addCommand({
			id: "set-task-to-todo",
			name: "Set Task Status to '01 - To Do'",
			callback: () => this.setActiveTaskStatus(TaskStatus.ToDo),
		});

		this.addCommand({
			id: "set-task-to-doing",
			name: "Set Task Status to '02 - Doing'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Doing),
		});

		this.addCommand({
			id: "set-task-to-done",
			name: "Set Task Status to '03 - Done'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Done),
		});

		this.addCommand({
			id: "set-task-to-abandoned",
			name: "Set Task Status to '04 - Abandoned'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Abandoned),
		});

		this.addCommand({
			id: "create-tasks-from-checkboxes",
			name: "Create Tasks from Checkboxes",
			callback: () => this.createNewTasksFromCheckboxes(),
		});

		this.addCommand({
			id: "set-task-to-high-priority",
			name: "Set Task Priority to '01 - High'",
			callback: () => this.setActiveTaskPriority(TaskPriority.High),
		});

		this.addCommand({
			id: "set-task-to-medium-priority",
			name: "Set Task Priority to '02 - Medium'",
			callback: () => this.setActiveTaskPriority(TaskPriority.Medium),
		});

		this.addCommand({
			id: "set-task-to-low-priority",
			name: "Set Task Priority to '03 - Low'",
			callback: () => this.setActiveTaskPriority(TaskPriority.Low),
		});
	}

	openProject = () => {
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = getProjects(this.app);
		selectProjectModal.onChoose = (project: Project) => {
			this.app.workspace.getLeaf(false).openFile(project.file);
		};
		selectProjectModal.open();
	};

	openTask = () => {
		const selectTaskModal = new ChooseTaskModal(this.app);
		const activeProject = getActiveProject(this.app);
		const options: getTaskOptions = {
			project: activeProject,
		};
		selectTaskModal.tasks = getTasks(this.app, options);
		selectTaskModal.onChoose = (task: Task) => {
			this.app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	};

	openTaskFromAnyProject = () => {
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = getProjects(this.app);
		selectProjectModal.onChoose = (project: Project) => {
			const selectTaskModal = new ChooseTaskModal(this.app);
			const options: getTaskOptions = {
				project,
			};
			selectTaskModal.tasks = getTasks(this.app, options);
			selectTaskModal.onChoose = (task: Task) => {
				this.app.workspace.getLeaf(false).openFile(task.file);
			};
			selectTaskModal.open();
		};
		selectProjectModal.open();
	};

	openParentProject = () => {
		const activeProject = getActiveProject(this.app);
		if (activeProject) {
			this.app.workspace.getLeaf(false).openFile(activeProject.file);
		}
	};

	createNewTask = () => {
		// See if the focussed file is a project. If it is, use that as the chosen project.
		const activeProject = getActiveProject(this.app);

		if (activeProject) {
			this.displayTaskNameInput(activeProject);
		} else {
			// Obtain a list of possible projects
			const projects = getProjects(this.app);

			// Display a modal to obtain the chosen project
			const selectProjectModal = new ChooseProjectModal(this.app);
			selectProjectModal.projects = projects;

			selectProjectModal.onChoose = this.displayTaskNameInput;
			selectProjectModal.open();
		}
	};

	createNewTaskForAnyProject = () => {
		// Obtain a list of possible projects
		const projects = getProjects(this.app);

		// Display a modal to obtain the chosen project
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = projects;

		selectProjectModal.onChoose = this.displayTaskNameInput;
		selectProjectModal.open();
	};

	createNewTasksFromCheckboxes = async () => {
		// Get the active editor
		const editor = this.app.workspace.activeEditor?.editor;
		if (!editor) {
			new Notice("No active editor found");
			return;
		}

		// Get selected text or current line
		let selectedText = editor.getSelection();
		let selectionRange: {
			from: { line: number; ch: number };
			to: { line: number; ch: number };
		} | null = null;

		if (!selectedText) {
			const cursor = editor.getCursor();
			selectedText = editor.getLine(cursor.line);
			selectionRange = {
				from: { line: cursor.line, ch: 0 },
				to: { line: cursor.line, ch: selectedText.length },
			};
		} else {
			selectionRange = {
				from: editor.getCursor("from"),
				to: editor.getCursor("to"),
			};
		}

		// Find all lines with unchecked checkboxes (excluding those that already contain links)
		const lines = selectedText.split("\n");
		const checkboxPattern = /^(\s*)- \[ \] (.+)$/;
		const linkPattern = /\[\[.+\]\]/;
		const checkboxLines: {
			lineIndex: number;
			indent: string;
			text: string;
			fullLine: string;
		}[] = [];

		lines.forEach((line, index) => {
			const match = line.match(checkboxPattern);
			if (match) {
				const checkboxText = match[2];
				// Skip checkboxes that already contain a link
				if (!linkPattern.test(checkboxText)) {
					checkboxLines.push({
						lineIndex: index,
						indent: match[1],
						text: checkboxText.trim(),
						fullLine: line,
					});
				}
			}
		});

		// Check if any unchecked checkboxes were found
		if (checkboxLines.length === 0) {
			new Notice("No unchecked checkboxes found");
			return;
		}

		// Get or prompt for active project
		let selectedProject = getActiveProject(this.app);

		if (!selectedProject) {
			// Prompt user to select a project
			const projects = getProjects(this.app);
			selectedProject = await new Promise<Project | null>((resolve) => {
				const selectProjectModal = new ChooseProjectModal(this.app);
				selectProjectModal.projects = projects;
				selectProjectModal.onChoose = (project: Project) => {
					resolve(project);
				};
				selectProjectModal.open();
			});

			if (!selectedProject) {
				new Notice("No project selected");
				return;
			}
		}

		// Create tasks for each checkbox
		let createdCount = 0;
		const replacements: { lineIndex: number; newLine: string }[] = [];

		for (const checkboxLine of checkboxLines) {
			const task = await createNewTask(
				this.app,
				checkboxLine.text,
				selectedProject,
			);
			if (task) {
				createdCount++;
				const newLine = `${checkboxLine.indent}- [ ] [[${task.name}]]`;
				replacements.push({
					lineIndex: checkboxLine.lineIndex,
					newLine,
				});
			}
		}

		// Replace the checkbox lines with links to the created tasks
		if (replacements.length > 0 && selectionRange) {
			const updatedLines = [...lines];
			replacements.forEach(({ lineIndex, newLine }) => {
				updatedLines[lineIndex] = newLine;
			});

			const newText = updatedLines.join("\n");
			editor.replaceRange(
				newText,
				selectionRange.from,
				selectionRange.to,
			);
		}

		// Display success message
		new Notice(
			`Created ${createdCount} task${createdCount !== 1 ? "s" : ""} for project [${selectedProject.name}]`,
		);
	};

	setActiveTaskStatus = (status: TaskStatus) => {
		const activeTask = getActiveTask(this.app);
		if (activeTask) {
			activeTask.status = status;
			updateTask(this.app, activeTask);
			new Notice(`Task [${activeTask.name}] set to [${status}]...`);
		}
	};

	setActiveTaskPriority = (priority: TaskPriority) => {
		const activeTask = getActiveTask(this.app);
		if (activeTask) {
			activeTask.priority = priority;
			updateTask(this.app, activeTask);
			new Notice(`Task [${activeTask.name}] set to [${priority}]...`);
		}
	};

	async displayTaskNameInput(selectedProject: Project) {
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
		const { value: name, submitKeybinding } = await TextInputModal.show(
			this.app,
			{
				title: "Task Name",
				placeholder: `Enter task name for project '${selectedProject.name}'...`,
				keybindings,
			},
		);
		const task = await createNewTask(this.app, name, selectedProject);
		if (task) {
			new Notice(`New task [${task.name}] created...`);
			switch (submitKeybinding) {
				case "enter":
					this.app.workspace.getLeaf(false).openFile(task.file);
					break;
				case "shift-enter":
					// Don't display the file
					break;
				default:
					console.error(
						`Unknown ConfirmationKeybinding type [${submitKeybinding}]`,
					);
					break;
			}
		}
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
