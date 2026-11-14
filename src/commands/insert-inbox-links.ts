import { App, Editor, MarkdownView, Notice } from "obsidian";
import { insertListLines } from "src/editor-utils";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getInboxFiles, getInboxDateGrouping } from "src/utilities";

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

export const insertInboxLinks = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const inboxFiles = getInboxFiles(app).sort((a, b) =>
		a.basename.localeCompare(b.basename),
	);
	if (inboxFiles.length === 0) {
		new Notice("No inbox notes found");
		return false;
	}

	const selected = await ConductorSelectorModal.showMulti(app, {
		items: inboxFiles,
		placeholder: "Select inbox notes...",
		emptyText: "No inbox notes found",
		getText: (file) => file.basename,
		groupings: [getInboxDateGrouping(app)],
	});
	if (selected.length === 0) return false;

	if (isInListContext(activeView.editor)) {
		insertListLines(
			activeView.editor,
			selected.map((file) => `- [[${file.basename}]]`),
		);
	} else {
		const inline = selected.map((file) => `[[${file.basename}]]`).join(", ");
		activeView.editor.replaceSelection(inline);
	}
	new Notice(
		`Inserted ${selected.length} inbox link${
			selected.length > 1 ? "s" : ""
		}`,
	);
	return true;
};