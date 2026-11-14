import { App, Notice, TFile } from "obsidian";
import { TextInputModal } from "src/text-input-modal";
import { getNoteTitle } from "src/utilities";

export const setDescriptionForCurrentNote = async (
	app: App,
	file: TFile,
	description: string,
): Promise<void> => {
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["description"] = description;
	});
	const title = getNoteTitle(app, file);
	new Notice(`Set description for "${title}"`);
};

export const showSetDescriptionForCurrentNote = async (
	app: App,
): Promise<void> => {
	const file = app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No note is open");
		return;
	}

	const current =
		app.metadataCache.getFileCache(file)?.frontmatter?.description;
	const initialValue =
		typeof current === "string" ? current : current != null ? String(current) : "";

	const { value, cancelled } = await TextInputModal.show(app, {
		title: "Description",
		placeholder: "Enter a description...",
		value: initialValue,
	});
	if (cancelled) return;

	await setDescriptionForCurrentNote(app, file, value.trim());
};