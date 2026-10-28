import { App, Editor, MarkdownView, Notice } from "obsidian";
import { insertListLines } from "src/editor-utils";
import { showOutstandingTasksSelector } from "src/insert-task-links-modal";
import { Task } from "src/tasks";

export const insertTaskLinks = async (app: App): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return;
	}

	const tasks = await showOutstandingTasksSelector(app);
	if (tasks.length === 0) return;

	insertTaskLinkLines(activeView.editor, tasks);
	new Notice(
		`Inserted ${tasks.length} task link${tasks.length > 1 ? "s" : ""}`,
	);
};

const insertTaskLinkLines = (editor: Editor, tasks: Task[]): void => {
	const taskLinkLines = tasks.map((t) => {
		const projectName = t.parents?.[0]?.name;
		if (projectName) {
			return `- [[${projectName}]] > [[${t.name}]]`;
		}
		return `- [[${t.name}]]`;
	});

	insertListLines(editor, taskLinkLines);
};
