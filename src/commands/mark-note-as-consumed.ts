import { App, Notice } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import {
	RATING_OPTIONS,
	getRatingChoiceLabel,
} from "./rate-release";

function hasOwn(value: Record<string, unknown>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}

function hasRating(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") {
		return value.trim() !== "" && Number(value) !== 0;
	}
	return value !== 0;
}

async function askForOptionalRating(app: App): Promise<number | null> {
	const choices = [...RATING_OPTIONS, 0] as const;
	const choice = await ConductorSelectorModal.show(app, {
		items: [...choices],
		defaultItem: 0,
		placeholder: "Add a rating (optional)...",
		getText: (rating) =>
			rating === 0 ? "No rating" : getRatingChoiceLabel(rating),
	});
	return choice !== null && choice > 0 ? choice : null;
}

export const markNoteAsConsumed = async (app: App): Promise<void> => {
	const file = app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No note is open");
		return;
	}

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (!frontmatter || !hasOwn(frontmatter, "consumed")) {
		new Notice("Note has no consumed field");
		return;
	}

	const rating = hasRating(frontmatter.rating)
		? null
		: await askForOptionalRating(app);

	await app.fileManager.processFrontMatter(file, (fm) => {
		if (hasOwn(fm, "to-consume")) {
			fm["to-consume"] = false;
		}
		if (hasOwn(fm, "consumed")) {
			fm["consumed"] = true;
		}
		if (rating !== null) {
			fm["rating"] = rating;
		}
	});

	new Notice("Marked note as consumed");
};
