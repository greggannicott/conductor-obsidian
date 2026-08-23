import { App, Editor, MarkdownView, Notice } from "obsidian";
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

	const cursorLine = editor.getCursor().line;
	const line = editor.getLine(cursorLine);
	const bareListMatch = line.match(/^(\s*)(?:- \[ \]|[-*+])\s*$/);
	const checkboxWithContentMatch = line.match(/^(\s*)- \[ \]/);
	const emptyLineMatch = line.match(/^\s*$/);

	if (bareListMatch) {
		const indent = bareListMatch[1];
		const replacement = taskLinkLines.map((l) => `${indent}${l}`).join("\n");
		editor.replaceRange(
			replacement,
			{ line: cursorLine, ch: 0 },
			{ line: cursorLine, ch: line.length },
		);
	} else if (checkboxWithContentMatch) {
		const indent = checkboxWithContentMatch[1];
		const insertion = taskLinkLines.map((l) => `${indent}${l}`).join("\n");
		editor.replaceRange("\n" + insertion, {
			line: cursorLine,
			ch: line.length,
		});
	} else if (emptyLineMatch) {
		editor.replaceRange(
			taskLinkLines.join("\n"),
			{ line: cursorLine, ch: 0 },
			{ line: cursorLine, ch: line.length },
		);
	} else {
		editor.replaceRange("\n" + taskLinkLines.join("\n"), {
			line: cursorLine,
			ch: line.length,
		});
	}
};
