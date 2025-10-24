import { Plugin } from "obsidian";

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
