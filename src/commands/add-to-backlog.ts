import { App, Notice, TFile, moment } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";
import {
	getArtists,
	getMusicReleases,
	getReleaseTitle,
} from "src/music-release";
import { BacklogItemStatus } from "src/backlog";

const BACKLOG_TEMPLATE_NAME = "Listen Backlog Item";

export const showAddToBacklog = async (
	app: App,
	preselectedRelease?: TFile | null,
): Promise<void> => {
	const releases = getMusicReleases(app);
	if (releases.length === 0) {
		new Notice("No music releases found");
		return;
	}

	let initialValue: string | undefined;
	if (preselectedRelease) {
		initialValue = getReleaseTitle(app, preselectedRelease);
	} else {
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

	const { value, cancelled } = await TextInputModal.show(app, {
		title: "Reason",
		placeholder: "Why do you want to listen to this? (optional)",
	});
	if (cancelled) return;

	await addBacklogItem(app, selected, value.trim());
};

export const addBacklogItem = async (
	app: App,
	release: TFile,
	reason: string,
): Promise<void> => {
	const albumName = getReleaseTitle(app, release);
	const filePath = getUniqueBacklogFilePath(app, albumName);

	const backlogFile = await createFileFromTemplate(
		app,
		filePath,
		BACKLOG_TEMPLATE_NAME,
	);
	if (!backlogFile) {
		new Notice(
			"Failed to create backlog item. Is the 'Listen Backlog Item' template available?",
		);
		return;
	}

	await app.fileManager.processFrontMatter(backlogFile, (fm) => {
		fm["music-release"] = `[[${release.basename}]]`;
		fm["reason"] = reason;
		fm["date-added"] = moment().format("YYYY-MM-DDTHH:mm:ss");
		fm["status"] = BacklogItemStatus.ToListen;
	});

	await app.workspace.getLeaf(false).openFile(release);
	new Notice(`Added "${albumName}" to backlog`);
};

function getUniqueBacklogFilePath(app: App, albumName: string): string {
	const timestamp = moment().format("YYYY-MM-DD HHmm");
	const baseName = sanitizeFileName(`${timestamp} - ${albumName}`);
	const basePath = `_backlog/${baseName}.md`;
	if (!app.vault.getFileByPath(basePath)) {
		return basePath;
	}

	let counter = 2;
	let proposedPath = `_backlog/${baseName} (${counter}).md`;
	while (app.vault.getFileByPath(proposedPath)) {
		counter++;
		proposedPath = `_backlog/${baseName} (${counter}).md`;
	}
	return proposedPath;
}