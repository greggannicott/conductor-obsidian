import { App, Editor, MarkdownView, Notice } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import { ComboModal } from "src/combo-modal";
import { ConfirmModal } from "src/confirm-modal";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { SelectionRange } from "src/editor-utils";
import { createFileFromTemplate, addTag, getPeople, sanitizeFileName } from "src/utilities";

// How the selected text in the source note is rewritten once the quote note
// exists. Offered after the filename is known, so every option can be built
// without touching the vault.
export enum QuoteReplacement {
	QuoteAsText = "quote-as-text",
	TitleAsText = "title-as-text",
	Embed = "embed",
}

const QUOTE_REPLACEMENTS: QuoteReplacement[] = [
	QuoteReplacement.QuoteAsText,
	QuoteReplacement.TitleAsText,
	QuoteReplacement.Embed,
];

const QUOTE_REPLACEMENT_LABELS: Record<QuoteReplacement, string> = {
	[QuoteReplacement.QuoteAsText]: "Replace with link using the quote as text",
	[QuoteReplacement.TitleAsText]: "Replace with link using the title as text",
	[QuoteReplacement.Embed]: "Replace with embed",
};

// A wikilink alias can't span newlines, so a multi-line quote collapses to a
// single line of display text. An empty result (the quote modal was cleared)
// falls back to the title rather than producing a bare `[[note|]]`.
const singleLine = (text: string): string =>
	text.replace(/\s*\n\s*/g, " ").trim();

const buildReplacementText = (
	replacement: QuoteReplacement,
	basename: string,
	quote: string,
): string => {
	switch (replacement) {
		case QuoteReplacement.QuoteAsText:
			return `[[${basename}|${singleLine(quote) || basename}]]`;
		case QuoteReplacement.TitleAsText:
			return `[[${basename}|${basename}]]`;
		case QuoteReplacement.Embed:
			return `![[${basename}]]`;
	}
};

// Replaces the originally-selected text with `text`. The range is captured
// before the modals open, so it can no longer be trusted blindly: if the note
// changed underneath us (a rename, a live sync, a stray keystroke) the range no
// longer holds the text we saw, and clobbering whatever is there now would be
// worse than leaving the source note alone.
const replaceSelection = (
	editor: Editor,
	range: SelectionRange,
	expectedText: string,
	text: string,
): void => {
	if (editor.getRange(range.from, range.to) !== expectedText) {
		new Notice("Source text changed; left the selection untouched.");
		return;
	}
	editor.replaceRange(text, range.from, range.to);
};

// Picks the `References/<person> on <about>` name, appending a counter until it
// is free. Kept separate from note creation so the filename is known up front.
const getUniqueQuoteFileName = (app: App, person: string, about: string): string => {
	const baseFileName = `${person} on ${sanitizeFileName(about)}`;
	let fileName = baseFileName;
	let counter = 1;

	while (app.vault.getFileByPath(`References/${fileName}.md`)) {
		fileName = `${baseFileName} ${counter}`;
		counter++;
	}

	return fileName;
};

export const createQuote = async (app: App): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	const selectedText = activeView?.editor?.getSelection() || "";

	const { value: quote, cancelled } = await TextInputModal.show(app, {
		title: "Quote",
		placeholder: "Enter the quote...",
		value: selectedText || undefined,
		multiline: true,
	});
	if (cancelled) return;

	const personItems = getPeople(app).map((f) => f.basename);
	const person = await ComboModal.show(app, {
		title: "Attribution",
		placeholder: "Who said this quote?",
		items: personItems,
	});
	if (!person) return;

	const { value: about } = await TextInputModal.show(app, {
		title: `${person} on...`,
		placeholder: "What is this quote about?",
	});

	const { value: source } = await TextInputModal.show(app, {
		title: "Source",
		placeholder: "Where did you see this quote?",
	});

	const fileName = getUniqueQuoteFileName(app, person, about);

	const referencesFolder = app.vault.getAbstractFileByPath("References");
	if (!referencesFolder) {
		await app.vault.createFolder("References");
	}

	const filePath = `References/${fileName}.md`;
	const file = await createFileFromTemplate(app, filePath, "Quote");

	if (file) {
		let content = await app.vault.read(file);
		content = content.replace(/PERSON/g, `[[${person}]]`);
		content = content.replace(/WHAT IS BEING DISCUSSED/g, about);

		const formattedQuote = quote
			.split("\n")
			.map((line) => `> > ${line}`)
			.join("\n");
		content = content.replace(/>\s*>\s*The quote/g, formattedQuote);

		content = content.replace(/SOURCE/g, source);
		await app.vault.modify(file, content);

		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["attributed-to"] = `[[${person}]]`;
		});

		await addTag(app, file, "inbox");

		new Notice(`Quote note created: ${fileName}`);
		app.workspace.getLeaf(false).openFile(file);
	} else {
		new Notice("Failed to create quote note. Template may be missing.");
	}
};

export const createQuoteUsingCurrentNoteAsSource = async (
	app: App,
): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView?.file) {
		new Notice("No active note to use as source.");
		return;
	}

	const currentNoteName = activeView.file.basename;
	const editor = activeView.editor;
	const selectedText = editor.getSelection() || "";
	// Captured before any modal opens: the selection is gone from the user's
	// point of view once focus moves, so the range has to be read now if the
	// selection is going to be replaced later.
	const selectedRange: SelectionRange | null = selectedText
		? { from: editor.getCursor("from"), to: editor.getCursor("to") }
		: null;

	const { value: quote, cancelled } = await TextInputModal.show(app, {
		title: "Quote",
		placeholder: "Enter the quote...",
		value: selectedText || undefined,
		multiline: true,
	});
	if (cancelled) return;

	const personItems = getPeople(app).map((f) => f.basename);
	const person = await ComboModal.show(app, {
		title: "Attribution",
		placeholder: "Who said this quote?",
		items: personItems,
	});
	if (!person) return;

	const { value: about } = await TextInputModal.show(app, {
		title: `${person} on...`,
		placeholder: "What is this quote about?",
	});

	const source = `[[${currentNoteName}]]`;

	// The filename is settled here, so the replace options can be built before
	// the note exists. Dismissing the style picker just skips the replacement;
	// the note is still created either way.
	const fileName = getUniqueQuoteFileName(app, person, about);
	let replacement: QuoteReplacement | null = null;
	if (selectedRange) {
		const shouldReplace = await ConfirmModal.show(app, {
			title: "Selected text",
			message:
				"Replace the selected text with a link to the new quote note?",
			confirmLabel: "Replace",
		});

		if (shouldReplace) {
			replacement = await ConductorSelectorModal.show(app, {
				items: QUOTE_REPLACEMENTS,
				placeholder: "How should the selection be replaced?",
				getText: (item) => QUOTE_REPLACEMENT_LABELS[item],
			});
		}
	}

	const referencesFolder = app.vault.getAbstractFileByPath("References");
	if (!referencesFolder) {
		await app.vault.createFolder("References");
	}

	const filePath = `References/${fileName}.md`;
	const file = await createFileFromTemplate(app, filePath, "Quote");

	if (file) {
		let content = await app.vault.read(file);
		content = content.replace(/PERSON/g, `[[${person}]]`);
		content = content.replace(/WHAT IS BEING DISCUSSED/g, about);

		const formattedQuote = quote
			.split("\n")
			.map((line) => `> > ${line}`)
			.join("\n");
		content = content.replace(/>\s*>\s*The quote/g, formattedQuote);

		content = content.replace(/SOURCE/g, source);
		await app.vault.modify(file, content);

		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["attributed-to"] = `[[${person}]]`;
		});

		await addTag(app, file, "inbox");

		new Notice(`Quote note created: ${fileName}`);

		if (replacement && selectedRange) {
			replaceSelection(
				editor,
				selectedRange,
				selectedText,
				buildReplacementText(replacement, fileName, quote),
			);
		}

		app.workspace.getLeaf(false).openFile(file);
	} else {
		new Notice("Failed to create quote note. Template may be missing.");
	}
};
