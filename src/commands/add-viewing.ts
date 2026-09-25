import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { DatePickerModal } from "src/date-picker-modal";
import { showMoviePicker } from "../choose-movie-modal";
import { getMovieRating, getMovieTitle, getMovies } from "src/movie";
import { RATING_OPTIONS, getRatingLabel } from "./rate-release";
import {
	createFileFromTemplate,
	isFileCategory,
	sanitizeFileName,
} from "src/utilities";

function formatDateTime(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = date.getFullYear();
	const mm = pad(date.getMonth() + 1);
	const dd = pad(date.getDate());
	const hh = pad(date.getHours());
	const mi = pad(date.getMinutes());
	const ss = pad(date.getSeconds());
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function getUniqueFilePath(app: App, basePath: string): string {
	let filePath = basePath;
	let counter = 2;
	while (app.vault.getFileByPath(filePath)) {
		filePath = basePath.replace(/\.md$/, ` (${counter}).md`);
		counter++;
	}
	return filePath;
}

async function askYesNo(
	app: App,
	placeholder: string,
): Promise<boolean | null> {
	return ConductorSelectorModal.show(app, {
		items: [false, true],
		defaultItem: false,
		placeholder,
		getText: (value) => (value ? "Yes" : "No"),
	});
}

async function askRating(
	app: App,
	file: TFile,
): Promise<number | null> {
	const current = getMovieRating(app, file);
	const defaultRating =
		current && current > 0 && current <= 5 ? current : 0;
	const choices = [...RATING_OPTIONS, 0] as const;
	return ConductorSelectorModal.show(app, {
		items: [...choices],
		defaultItem: defaultRating,
		placeholder: "Select a rating...",
		getText: (rating) =>
			rating === 0 ? "No rating" : getRatingLabel(rating),
		getBadges: (rating) =>
			rating === defaultRating ? ["✓"] : [],
	});
}

export const showAddViewing = async (app: App): Promise<void> => {
	if (getMovies(app).length === 0) {
		new Notice("No movies found");
		return;
	}

	let initialValue: string | undefined;
	const activeFile = app.workspace.activeEditor?.file;
	if (activeFile && isFileCategory(app, activeFile, "Movie")) {
		initialValue = getMovieTitle(app, activeFile);
	}

	const selected = await showMoviePicker(app, { initialValue });
	if (!selected) return;
	await addViewing(app, selected);
};

export const addViewing = async (app: App, file: TFile): Promise<void> => {
	const date = await DatePickerModal.show(app);
	if (date === null) return;

	const withBecky = await askYesNo(app, "Was this with Becky?");
	if (withBecky === null) return;

	const atCinema = await askYesNo(app, "Was this at the cinema?");
	if (atCinema === null) return;

	const rating = await askRating(app, file);
	if (rating === null) return;

	const fileName = `${formatDateTime(new Date())} - Viewing.md`;
	const filePath = getUniqueFilePath(
		app,
		`_consumptions/${sanitizeFileName(fileName)}`,
	);
	const viewingFile = await createFileFromTemplate(
		app,
		filePath,
		"Viewing",
	);
	if (!viewingFile) {
		new Notice(
			"Failed to create viewing note. Is the 'Viewing' template available?",
		);
		return;
	}

	await app.fileManager.processFrontMatter(viewingFile, (fm) => {
		fm["movie"] = `[[${file.basename}]]`;
		fm["date"] = date;
		fm["at-cinema"] = atCinema;
		fm["with-becky"] = withBecky;
	});

	await app.fileManager.processFrontMatter(file, (fm) => {
		if (fm["to-watch"] === true) {
			fm["to-watch"] = false;
		}
		fm["watched"] = true;
		fm["rating"] = rating;
	});

	new Notice(`Created viewing note: ${viewingFile.basename}`);
};
