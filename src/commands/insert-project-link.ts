import { App, MarkdownView, Notice } from "obsidian";
import { insertListLines } from "src/editor-utils";
import { showOutstandingProjectsSelector } from "src/insert-project-link-modal";

export const insertProjectLink = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const projects = await showOutstandingProjectsSelector(app);
	if (projects.length === 0) return false;

	insertListLines(
		activeView.editor,
		projects.map((project) => `- [[${project.name}]]`),
	);
	new Notice(
		`Inserted ${projects.length} project link${
			projects.length > 1 ? "s" : ""
		}`,
	);
	return true;
};
