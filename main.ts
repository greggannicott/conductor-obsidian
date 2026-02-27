import { Plugin, TFile } from "obsidian";

import { ChooseProjectModal } from "src/choose-project-modal";
import { TextInputModal } from "src/text-input-modal";

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
			id: "create-new-task",
			name: "Create New Task",
			callback: async () => {
				let file;
				const taskName = await TextInputModal.show(this.app, {
					title: "Task Name",
					placeholder: "Enter task name...",
				});

				const filePath = `${taskName}.md`;

				// Obtain a list of possible projects
				const projects = this.getProjects();

				// Display a modal to obtain the chosen project
				const selectProjectModal = new ChooseProjectModal(this.app);
				selectProjectModal.projects = projects;
				selectProjectModal.onChoose = async (
					selectedProject: TFile,
				) => {
					// Read file. Create it if it doesn't exist.
					file = this.app.vault.getFileByPath(filePath);
					if (!file) {
						const fileContent = "";
						file = await this.app.vault.create(
							filePath,
							fileContent,
						);
					}

					// Update the frontmatter value to set a parent project.
					if (file) {
						await this.app.fileManager.processFrontMatter(
							file,
							(fm) => {
								fm["parents"] = [
									`[[${selectedProject.basename}]]`,
								];
							},
						);
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

	// Get a list of projects.
	// A project is a file that includes a `categories` value of "[[Project]]"
	getProjects() {
		const files = this.app.vault.getMarkdownFiles();
		const projects = files.filter((f) => {
			const frontmatter =
				this.app.metadataCache.getFileCache(f)?.frontmatter;
			return frontmatter?.categories?.contains("[[Project]]");
		});
		return projects;
	}
}
