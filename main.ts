import { Plugin } from "obsidian";

interface ConductorSettings {
	taskId: number;
}

const DEFAULT_SETTINGS: ConductorSettings = {
	taskId: 0,
};

export default class ConductorObsidian extends Plugin {
	settings: ConductorSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "insert-task-id",
			name: "Insert Task ID",
			hotkeys: [{ modifiers: ["Ctrl"], key: "t" }],
			editorCallback: async (editor, _) => {
				// Set new task ID
				this.settings.taskId++;
				const taskId = `tsk-${this.settings.taskId}`;

				// Insert task ID
				editor.replaceRange(taskId, editor.getCursor());

				// Move cursor to end of new ID
				const { line, ch } = editor.getCursor();
				const newCursorPosition = { line, ch: ch + taskId.length };
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
