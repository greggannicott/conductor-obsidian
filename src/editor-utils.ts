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
