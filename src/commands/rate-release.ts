import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getReleaseTitle } from "src/music-release";

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function getRatingLabel(rating: number): string {
	return "★".repeat(rating);
}

// The label for a row in a rating picker. Prefixed with the number so the
// rating can be typed straight into the filter, and so the rows read as a
// scale rather than a list of similar-looking stars.
export function getRatingChoiceLabel(rating: number): string {
	return `${rating} - ${getRatingLabel(rating)}`;
}

export async function rateRelease(
	app: App,
	release: TFile,
	rating: number,
): Promise<void> {
	if (rating < 0 || rating > 5) {
		new Notice(`Invalid rating: ${rating}`);
		return;
	}
	await app.fileManager.processFrontMatter(release, (fm) => {
		fm["rating"] = rating;
	});
	const title = getReleaseTitle(app, release);
	new Notice(
		rating > 0
			? `Rated "${title}" ${getRatingLabel(rating)}`
			: `Cleared rating for "${title}"`,
	);
}