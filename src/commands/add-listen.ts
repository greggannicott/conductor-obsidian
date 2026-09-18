import { App, Notice, TFile, moment } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";
import {
	getArtists,
	getFormats,
	getListenDatesForRelease,
	getMusicReleases,
	getReleaseFile,
	getReleaseTitle,
} from "src/music-release";
import {
	getBacklogItemReleaseName,
	markBacklogItemsListened,
} from "src/backlog";

const MUSIC_ASSISTANT_FORMAT = "[[Music Assistant]]";
const SPOTIFY_FORMAT = "[[Spotify]]";

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

export const showAddListen = async (app: App): Promise<void> => {
	const releases = getMusicReleases(app);
	if (releases.length === 0) {
		new Notice("No music releases found");
		return;
	}

	let initialValue: string | undefined;
	const activeFile = app.workspace.activeEditor?.file;
	if (activeFile) {
		const metadata = app.metadataCache.getFileCache(activeFile);
		const categories = metadata?.frontmatter?.categories;
		const isMusicRelease =
			categories &&
			Array.isArray(categories) &&
			categories.includes("[[Music Release]]");
		if (isMusicRelease) {
			initialValue = getReleaseTitle(app, activeFile);
		}

		const isBacklogItem =
			categories &&
			Array.isArray(categories) &&
			categories.includes("[[Backlog Item]]");
		if (isBacklogItem) {
			const releaseName = getBacklogItemReleaseName(app, activeFile);
			if (releaseName) {
				const release = getReleaseFile(app, releaseName, activeFile.path);
				if (release) {
					initialValue = getReleaseTitle(app, release);
				}
			}
		}
	}

	const selected = await ConductorSelectorModal.show(app, {
		items: releases,
		placeholder: "Select a music release...",
		initialValue,
		getText: (file) => getReleaseTitle(app, file),
		getSubtext: (file) => {
			const artists = getArtists(app, file);
			return artists ? artists : null;
		},
	});
	if (!selected) return;
	await addListen(app, selected);
};

export const addListen = async (app: App, file: TFile): Promise<void> => {
	let listenCount: number | null = null;
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["listens"] = (fm["listens"] ?? 0) + 1;
		listenCount =
			typeof fm["listens"] === "number" ? fm["listens"] : null;
	});

	const now = new Date();
	const dateTime = formatDateTime(now);
	const title = `${dateTime} - Listen`;
	const fileName = `${title}.md`;
	const filePath = getUniqueFilePath(
		app,
		`_consumptions/${sanitizeFileName(fileName)}`,
	);

	const releaseFrontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const growing = releaseFrontmatter?.growing;
	const inRotation = releaseFrontmatter?.["in-rotation"];
	const rating = releaseFrontmatter?.rating;

	const priorListenDates = getListenDatesForRelease(app, file.basename);
	let daysSinceLastListen: number | null = null;
	if (priorListenDates.length > 0) {
		const last = moment(priorListenDates[0], "YYYY-MM-DD HH:mm:ss");
		if (last.isValid()) {
			daysSinceLastListen = Math.max(
				0,
				Math.floor(
					(now.getTime() - last.toDate().getTime()) / 86400000,
				),
			);
		}
	}

	const formatOptions = [
		...getFormats(app, file),
		MUSIC_ASSISTANT_FORMAT,
		SPOTIFY_FORMAT,
	];
	const format = await ConductorSelectorModal.show(app, {
		items: formatOptions,
		placeholder: "Select a format...",
		getText: (item) => item.replace(/^\[\[|\]\]$/g, "").trim(),
	});

	const { value, cancelled } = await TextInputModal.show(app, {
		title: "Notes",
		placeholder: "Anything noteworthy about this listen? (optional)",
		multiline: true,
	});
	const trimmedNotes = cancelled ? "" : value.trim();

	const markedItems = await markBacklogItemsListened(app, file.basename);

	const listenFile = await createFileFromTemplate(app, filePath, "Listen");
	if (!listenFile) {
		new Notice(
			"Failed to create listen note. Is the 'Listen' template available?",
		);
		return;
	}

	await app.fileManager.processFrontMatter(listenFile, (fm) => {
		fm["music-release"] = `[[${file.basename}]]`;
		fm["date-time"] = dateTime;
		fm["growing"] = typeof growing === "boolean" ? growing : null;
		fm["in-rotation"] = typeof inRotation === "boolean" ? inRotation : null;
		fm["format"] = format;
		fm["listen-no"] = listenCount;
		fm["rating-before"] = typeof rating === "number" ? rating : null;
		fm["days-since-last-listen"] = daysSinceLastListen;
		fm["notes"] = trimmedNotes.length > 0 ? trimmedNotes : null;
		fm["backlog-listens"] =
			markedItems.length > 0
				? markedItems.map((item) => `[[${item.basename}]]`)
				: null;
	});

	if (markedItems.length > 0) {
		new Notice(`Marked ${markedItems.length} backlog item(s) as listened`);
	}

	new Notice(`Created listen note: ${listenFile.basename}`);
};