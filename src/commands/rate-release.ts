import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { showMusicReleasePicker } from "../choose-music-release-modal";
import {
	getMusicReleases,
	getRateableRelease,
	getReleaseRating,
	getReleaseTitle,
} from "src/music-release";

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function getRatingLabel(rating: number): string {
	return "★".repeat(rating);
}

export const showRateRelease = async (app: App): Promise<void> => {
	const releases = getMusicReleases(app);
	if (releases.length === 0) {
		new Notice("No music releases found");
		return;
	}

	let initialValue: string | undefined;
	const activeFile = app.workspace.activeEditor?.file;
	if (activeFile) {
		const release = getRateableRelease(app, activeFile);
		if (release) initialValue = getReleaseTitle(app, release);
	}

	const selected = await showMusicReleasePicker(app, { initialValue });
	if (!selected) return;
	await showRatingOptions(app, selected);
};

async function showRatingOptions(app: App, release: TFile): Promise<void> {
	const current = getReleaseRating(app, release);
	const choices = [...RATING_OPTIONS, 0] as const;
	const choice = await ConductorSelectorModal.show(app, {
		items: [...choices],
		placeholder: "Select a rating...",
		getText: (c) => (c === 0 ? "Clear" : getRatingLabel(c)),
		getBadges: (c) => (c !== 0 && c === current ? ["✓"] : []),
	});
	if (choice === null) return;
	await rateRelease(app, release, choice);
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