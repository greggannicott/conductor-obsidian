import { App, Editor, MarkdownView, Notice } from "obsidian";
import { insertListLines } from "src/editor-utils";
import { showOutstandingTasksSelector } from "src/insert-task-links-modal";
import { Task } from "src/tasks";

export const insertTaskLinks = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const tasks = await showOutstandingTasksSelector(app);
	if (tasks.length === 0) return false;

	if (isInListContext(activeView.editor)) {
		insertTaskLinkLines(activeView.editor, tasks);
	} else {
		const inline = tasks.map((t) => `[[${t.name}]]`).join(", ");
		activeView.editor.replaceSelection(inline);
	}
	new Notice(
		`Inserted ${tasks.length} task link${tasks.length > 1 ? "s" : ""}`,
	);
	return true;
};

// True when the cursor sits at the start of a line or on an existing list item,
// so the bullet/newline behaviour of insertListLines is appropriate. Otherwise
// the links are inserted inline at the cursor.
const isInListContext = (editor: Editor): boolean => {
	if (editor.getCursor().ch === 0) return true;
	const line = editor.getLine(editor.getCursor().line);
	return (
		/^\s*(?:[-*+]|\d+\.)\s/.test(line) ||
		/^\s*(?:[-*+]|\d+\.)\s*$/.test(line)
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
