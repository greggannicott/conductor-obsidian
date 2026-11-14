import { App, Editor, MarkdownView, Notice } from "obsidian";
import { insertListLines } from "src/editor-utils";
import { showOutstandingProjectsSelector } from "src/insert-project-link-modal";

// True when the cursor sits at the start of a line or on an existing list item,
// so the bullet/newline behaviour of insertListLines is appropriate. Otherwise
// the links are inserted inline at the cursor.
const isInListContext = (editor: Editor): boolean => {
	if (editor.getCursor().ch === 0) return true;
	const line = editor.getLine(editor.getCursor().line);
	return (
		/^\\s*(?:[-*+]|\\d+\\.)\\s/.test(line) ||
		/^\\s*(?:[-*+]|\\d+\\.)\\s*$/.test(line)
	);
};

export const insertProjectLink = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const projects = await showOutstandingProjectsSelector(app);
	if (projects.length === 0) return false;

	if (isInListContext(activeView.editor)) {
		insertListLines(
			activeView.editor,
			projects.map((project) => `- [[${project.name}]]`),
		);
	} else {
		const inline = projects
			.map((project) => `[[${project.name}]]`)
			.join(", ");
		activeView.editor.replaceSelection(inline);
	}
	new Notice(
		`Inserted ${projects.length} project link${
			projects.length > 1 ? "s" : ""
		}`,
	);
	return true;
};
