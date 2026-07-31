import { App, MarkdownView, Notice } from "obsidian";
import { InsertTaskLinksModal } from "src/insert-task-links-modal";
import { Task } from "src/tasks";

export const insertTaskLinks = (app: App): void => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return;
	}

	const modal = new InsertTaskLinksModal(app);
	modal.onChoose = (tasks: Task[]) => {
		if (tasks.length === 0) return;
		const taskLinkLines = tasks.map((t) => {
			const projectName = t.parents?.[0]?.name;
			if (projectName) {
				return `- [ ] [[${projectName}]] > [[${t.name}]]`;
			}
			return `- [ ] [[${t.name}]]`;
		});

		const editor = activeView.editor;
		const cursorLine = editor.getCursor().line;
		const line = editor.getLine(cursorLine);
		const bareCheckboxMatch = line.match(/^(\s*)- \[ \]\s*$/);
		const checkboxWithContentMatch = line.match(/^(\s*)- \[ \]/);

		if (bareCheckboxMatch) {
			const indent = bareCheckboxMatch[1];
			const replacement = taskLinkLines
				.map((l) => `${indent}${l}`)
				.join("\n");
			editor.replaceRange(
				replacement,
				{ line: cursorLine, ch: 0 },
				{ line: cursorLine, ch: line.length },
			);
		} else if (checkboxWithContentMatch) {
			const indent = checkboxWithContentMatch[1];
			const insertion = taskLinkLines
				.map((l) => `${indent}${l}`)
				.join("\n");
			editor.replaceRange("\n" + insertion, {
				line: cursorLine,
				ch: line.length,
			});
		} else {
			editor.replaceSelection(taskLinkLines.join("\n") + "\n");
		}

		new Notice(
			`Inserted ${tasks.length} task link${tasks.length > 1 ? "s" : ""}`,
		);
	};
	modal.open();
};
