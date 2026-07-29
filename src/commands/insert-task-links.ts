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
		const lines = tasks
			.map((t) => {
				const projectName = t.parents?.[0]?.name;
				if (projectName) {
					return `- [ ] [[${projectName}]] > [[${t.name}]]`;
				}
				return `- [ ] [[${t.name}]]`;
			})
			.join("\n");
		activeView.editor.replaceSelection(lines + "\n");
		new Notice(
			`Inserted ${tasks.length} task link${tasks.length > 1 ? "s" : ""}`,
		);
	};
	modal.open();
};
