import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { createFileFromTemplate, getFilesWithCategory, sanitizeFileName } from "src/utilities";

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

function getReleaseTitle(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const title = frontmatter?.title;
	return typeof title === "string" && title.trim()
		? title.trim()
		: file.basename;
}

function getArtists(app: App, file: TFile): string {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const artists = frontmatter?.artists;
	if (!Array.isArray(artists)) return "";
	return artists
		.map((artist) => String(artist).replace(/^\[\[|\]\]$/g, "").trim())
		.filter(Boolean)
		.join(", ");
}

export const showAddListen = async (app: App): Promise<void> => {
	const releases = getFilesWithCategory(app, "Music Release");
	if (releases.length === 0) {
		new Notice("No music releases found");
		return;
	}
	releases.sort((a, b) =>
		getReleaseTitle(app, a).localeCompare(getReleaseTitle(app, b)),
	);

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
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["listens"] = (fm["listens"] ?? 0) + 1;
	});

	const now = new Date();
	const dateTime = formatDateTime(now);
	const title = `${dateTime} - Listen`;
	const fileName = `${title}.md`;
	const filePath = getUniqueFilePath(
		app,
		`_consumptions/${sanitizeFileName(fileName)}`,
	);

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
	});

	await app.workspace.getLeaf(false).openFile(listenFile);
	new Notice(`Created listen note: ${listenFile.basename}`);
};
