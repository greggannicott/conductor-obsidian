import { App, Editor, Notice } from "obsidian";

export type EditorLike = Editor;
export type EditorPosition = { line: number; ch: number };
export type SelectionRange = { from: EditorPosition; to: EditorPosition };

export interface SelectedEditorContent {
	lines: string[];
	range: SelectionRange;
}

export interface LineReplacement {
	lineIndex: number;
	newLine: string;
}

export const getActiveEditorOrNotify = (app: App): EditorLike | null => {
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) {
		new Notice("No active editor found");
		return null;
	}
	return editor;
};

export const getSelectedEditorContent = (
	editor: EditorLike,
): SelectedEditorContent => {
	const selectedText = editor.getSelection();
	if (!selectedText) {
		return getCurrentLineContent(editor);
	}

	const range = {
		from: editor.getCursor("from"),
		to: editor.getCursor("to"),
	};
	return { lines: selectedText.split("\n"), range };
};

export const getCurrentLineContent = (
	editor: EditorLike,
): SelectedEditorContent => {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const range = {
		from: { line: cursor.line, ch: 0 },
		to: { line: cursor.line, ch: line.length },
	};
	return { lines: [line], range };
};

// Insert markdown list lines at the cursor, adapting to the current line: a
// bare list marker or checkbox is replaced, an empty line is filled, and a
// checkbox with content or plain text gets the lines appended below.
export const insertListLines = (
	editor: EditorLike,
	lines: string[],
): void => {
	const cursorLine = editor.getCursor().line;
	const line = editor.getLine(cursorLine);
	const bareListMatch = line.match(/^(\s*)(?:- \[ \]|[-*+])\s*$/);
	const checkboxWithContentMatch = line.match(/^(\s*)- \[ \]/);
	const emptyLineMatch = line.match(/^\s*$/);

	if (bareListMatch) {
		const indent = bareListMatch[1];
		const replacement = lines.map((l) => `${indent}${l}`).join("\n");
		editor.replaceRange(
			replacement,
			{ line: cursorLine, ch: 0 },
			{ line: cursorLine, ch: line.length },
		);
	} else if (checkboxWithContentMatch) {
		const indent = checkboxWithContentMatch[1];
		const insertion = lines.map((l) => `${indent}${l}`).join("\n");
		editor.replaceRange("\n" + insertion, {
			line: cursorLine,
			ch: line.length,
		});
	} else if (emptyLineMatch) {
		editor.replaceRange(
			lines.join("\n"),
			{ line: cursorLine, ch: 0 },
			{ line: cursorLine, ch: line.length },
		);
	} else {
		editor.replaceRange("\n" + lines.join("\n"), {
			line: cursorLine,
			ch: line.length,
		});
	}
};

// Replace a captured selection range with `text` when its contents are
// unchanged; otherwise show a notice and return false so the caller can decide
// what to do. When `range` is null, insert at the cursor. Mirrors the
// safety check in create-quote's replaceSelection.
export const replaceSelectionRangeOrInsert = (
	editor: EditorLike,
	range: SelectionRange | null,
	expectedText: string,
	text: string,
): boolean => {
	if (range) {
		if (editor.getRange(range.from, range.to) !== expectedText) {
			new Notice("Source text changed; left the selection untouched.");
			return false;
		}
		editor.replaceRange(text, range.from, range.to);
		return true;
	}
	editor.replaceRange(text, editor.getCursor());
	return true;
};

export const replaceLinesInEditor = (
	editor: EditorLike,
	selectedEditorContent: SelectedEditorContent,
	replacements: LineReplacement[],
) => {
	if (replacements.length === 0) return;

	const updatedLines = [...selectedEditorContent.lines];
	replacements.forEach(({ lineIndex, newLine }) => {
		updatedLines[lineIndex] = newLine;
	});

	const newText = updatedLines.join("\n");
	editor.replaceRange(
		newText,
		selectedEditorContent.range.from,
		selectedEditorContent.range.to,
	);
};
