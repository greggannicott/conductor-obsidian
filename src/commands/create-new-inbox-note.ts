import { App, Notice, TFile } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import {
	createFileFromTemplate,
	sanitizeFileName,
	vaultFileExists,
} from "src/utilities";

function getUniqueInboxFileName(app: App, sanitizedName: string): string {
	const path = `${sanitizedName}.md`;
	if (!vaultFileExists(app, path)) {
		return sanitizedName;
	}

	let postfix = 0;
	let proposedName = "";
	let taken = true;
	while (taken) {
		postfix++;
		proposedName = `${sanitizedName} - ${postfix}`;
		if (!vaultFileExists(app, `${proposedName}.md`)) {
			taken = false;
		}
	}
	return proposedName;
}

export const createNewInboxNote = async (app: App): Promise<void> => {
	const result = await TextInputModal.show(app, {
		title: "Create Inbox Note",
		placeholder: "Title\nBody...",
		multiline: true,
	});
	if (result.cancelled) return;

	const lines = result.value.split(/\r?\n/);
	const title = lines[0]?.trim();
	const body = lines.slice(1).join("\n").trim();

	if (!title) {
		new Notice("A title is required");
		return;
	}

	const sanitizedName = sanitizeFileName(title);
	if (!sanitizedName) {
		new Notice("A valid title is required");
		return;
	}

	const uniqueName = getUniqueInboxFileName(app, sanitizedName);
	const filePath = `${uniqueName}.md`;

	const file = await createFileFromTemplate(app, filePath, "Inbox");
	if (!file) {
		new Notice(
			"Failed to create inbox note. Is the 'Inbox' template available?",
		);
		return;
	}

	if (body) {
		const content = await app.vault.read(file);
		const separator = content.endsWith("\n") ? "" : "\n";
		await app.vault.modify(file, `${content}${separator}${body}\n`);
	}

	new Notice(`Created inbox note: ${file.basename}`);
};
