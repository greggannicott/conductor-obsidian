import { App, Notice, TFile, moment } from "obsidian";
import { TextInputModal } from "./text-input-modal";
import { createFileFromTemplate, sanitizeFileName } from "./utilities";

// Frontmatter as Obsidian hands it to processFrontMatter: the template's
// properties plus whatever the caller adds.
type JournalFrontmatter = Record<string, unknown>;

// Asks for the human-readable part of the note's name. Returns null when the
// prompt was cancelled or left blank.
export async function promptJournalNoteTitle(
	app: App,
): Promise<string | null> {
	const prompt = await TextInputModal.show(app, {
		title: "Title of journal note",
		placeholder: "Enter title...",
	});
	if (prompt.cancelled) return null;

	const title = prompt.value.trim();
	if (!title) {
		new Notice("Journal note title cannot be blank");
		return null;
	}
	return title;
}

// Creates a journal note at the vault root, named after the moment it was
// created (YYYY-MM-DD HHmm - Title), then opens it. `applyFrontmatter` adds the
// properties that make the note belong to something — its topics, problems or
// epic. Returns null when the template is missing.
export async function createJournalNote(
	app: App,
	title: string,
	applyFrontmatter?: (fm: JournalFrontmatter) => void,
): Promise<TFile | null> {
	const baseName = `${moment().format("YYYY-MM-DD HHmm")} - ${sanitizeFileName(title)}`;
	const file = await createFileFromTemplate(
		app,
		`${getUniqueJournalFileName(app, baseName)}.md`,
		"Journal",
	);
	if (!file) {
		new Notice("Failed to create journal note. Template may be missing.");
		return null;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.categories = getFilledValues(fm.categories);
		if (!fm.categories.includes("[[Journal]]")) {
			fm.categories.push("[[Journal]]");
		}
		applyFrontmatter?.(fm);
	});

	app.workspace.getLeaf(false).openFile(file);
	return file;
}

// The Journal template ships with a blank list item under `categories`, which
// Obsidian reads as a null entry. Left alone it is written back out as an empty
// property value on every new note, so blank entries are dropped first.
function getFilledValues(value: unknown): string[] {
	const entries = Array.isArray(value) ? value : [value];
	return entries
		.filter((entry): entry is string => typeof entry === "string")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

// Two notes created in the same minute would otherwise collide.
function getUniqueJournalFileName(app: App, baseName: string): string {
	let candidate = baseName;
	let counter = 2;
	while (app.vault.getFileByPath(`${candidate}.md`)) {
		candidate = `${baseName} (${counter})`;
		counter++;
	}
	return candidate;
}
