import { App, MarkdownView, Notice } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import {
	replaceSelectionRangeOrInsert,
	SelectionRange,
} from "src/editor-utils";
import { createProjectNote } from "./create-project-note";
import { showProjectNoteSelector } from "src/choose-project-note-modal";
import { getNoteTitle } from "src/utilities";

export const insertProjectNote = async (app: App): Promise<boolean> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) {
		new Notice("No active editor to insert into");
		return false;
	}

	const editor = activeView.editor;
	const selectedText = editor.getSelection() ?? "";
	const selectedRange: SelectionRange | null = selectedText
		? { from: editor.getCursor("from"), to: editor.getCursor("to") }
		: null;

	const choice = await showProjectNoteSelector(app, { includeCreate: true });
	if (!choice) return false;

	let note: Awaited<ReturnType<typeof createProjectNote>>;
	if (choice.kind === "create") {
		note = await createProjectNote(app, {
			openCreated: false,
			selectedText,
		});
	} else {
		note = choice.file;
	}
	if (!note) return false;

	const noteTitle = getNoteTitle(app, note).replace(
		/^(Project Note|project-note) - /i,
		"",
	);
	const defaultDisplay = selectedText || noteTitle;
	const prompt = await TextInputModal.show(app, {
		title: "Text to display",
		placeholder: "Text to display",
		value: defaultDisplay,
	});
	if (prompt.cancelled) return false;

	const displayText = prompt.value.trim() || defaultDisplay;
	const sanitizedDisplay = displayText.replace(/\|/g, "").replace(/]]/g, "]");

	const link =
		sanitizedDisplay === ""
			? `[[${note.basename}]]`
			: `[[${note.basename}|${sanitizedDisplay}]]`;

	const inserted = replaceSelectionRangeOrInsert(
		editor,
		selectedRange,
		selectedText,
		link,
	);
	if (!inserted) return false;

	new Notice(`Inserted link to "${sanitizedDisplay || note.basename}"`);
	return true;
};
