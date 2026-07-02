import { App, MarkdownView, Notice } from "obsidian";
import { LongTextInputModal } from "src/long-text-input-modal";
import { TextInputModal } from "src/text-input-modal";
import { createFileFromTemplate, addTag } from "src/utilities";

export const createQuote = async (app: App): Promise<void> => {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	const selectedText = activeView?.editor?.getSelection() || "";

	const { value: quote } = await LongTextInputModal.show(app, {
		title: "Quote",
		placeholder: "Enter the quote...",
		initialValue: selectedText || undefined,
	});

	const { value: person } = await TextInputModal.show(app, {
		title: "Person",
		placeholder: "Who said this quote?",
	});

	const { value: about } = await TextInputModal.show(app, {
		title: `${person} on...`,
		placeholder: "What is this quote about?",
	});

	const { value: source } = await TextInputModal.show(app, {
		title: "Source",
		placeholder: "Where did you see this quote?",
	});

	const baseFileName = `${person} on ${about}`;
	let fileName = baseFileName;
	let counter = 1;

	const referencesFolder = app.vault.getAbstractFileByPath("References");
	if (!referencesFolder) {
		await app.vault.createFolder("References");
	}

	while (app.vault.getFileByPath(`References/${fileName}.md`)) {
		fileName = `${baseFileName} ${counter}`;
		counter++;
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
	const selectedText = activeView?.editor?.getSelection() || "";

	const { value: quote } = await LongTextInputModal.show(app, {
		title: "Quote",
		placeholder: "Enter the quote...",
		initialValue: selectedText || undefined,
	});

	const { value: person } = await TextInputModal.show(app, {
		title: "Person",
		placeholder: "Who said this quote?",
	});

	const { value: about } = await TextInputModal.show(app, {
		title: `${person} on...`,
		placeholder: "What is this quote about?",
	});

	const source = `[[${currentNoteName}]]`;

	const baseFileName = `${person} on ${about}`;
	let fileName = baseFileName;
	let counter = 1;

	const referencesFolder = app.vault.getAbstractFileByPath("References");
	if (!referencesFolder) {
		await app.vault.createFolder("References");
	}

	while (app.vault.getFileByPath(`References/${fileName}.md`)) {
		fileName = `${baseFileName} ${counter}`;
		counter++;
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

		await addTag(app, file, "inbox");

		new Notice(`Quote note created: ${fileName}`);
		app.workspace.getLeaf(false).openFile(file);
	} else {
		new Notice("Failed to create quote note. Template may be missing.");
	}
};
