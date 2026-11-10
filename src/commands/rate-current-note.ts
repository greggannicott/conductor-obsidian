import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getNoteTitle } from "src/utilities";
import {
	RATING_OPTIONS,
	getRatingChoiceLabel,
	getRatingLabel,
} from "./rate-release";

function getCurrentRating(app: App, file: TFile): number | null {
	const rating = app.metadataCache.getFileCache(file)?.frontmatter?.rating;
	if (typeof rating === "number") {
		return Number.isFinite(rating) ? rating : null;
	}
	if (typeof rating === "string") {
		const value = Number(rating.trim());
		return Number.isFinite(value) ? value : null;
	}
	return null;
}

export async function rateCurrentNote(
	app: App,
	file: TFile,
	rating: number,
): Promise<void> {
	if (rating < 0 || rating > 5) {
		new Notice(`Invalid rating: ${rating}`);
		return;
	}
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["rating"] = rating;
	});
	const title = getNoteTitle(app, file);
	new Notice(
		rating > 0
			? `Rated "${title}" ${getRatingLabel(rating)}`
			: `Cleared rating for "${title}"`,
	);
}

export const showRateCurrentNote = async (app: App): Promise<void> => {
	const file = app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No note is open");
		return;
	}

	const current = getCurrentRating(app, file);
	const defaultRating =
		current !== null && current > 0 && current <= 5 ? current : 0;

	const choices = [...RATING_OPTIONS, 0] as const;
	const choice = await ConductorSelectorModal.show(app, {
		items: [...choices],
		defaultItem: defaultRating,
		placeholder: "Select a rating...",
		getText: (c) => (c === 0 ? "Clear" : getRatingChoiceLabel(c)),
		getBadges: (c) => (c !== 0 && c === current ? ["✓"] : []),
	});
	if (choice === null) return;
	await rateCurrentNote(app, file, choice);
};
