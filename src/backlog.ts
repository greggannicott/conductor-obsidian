import { App, TFile, moment } from "obsidian";
import { getFilesWithCategory } from "./utilities";

export const BACKLOG_ITEM_CATEGORY = "Backlog Item";

export enum BacklogItemStatus {
	ToListen = "01 - To Listen",
	Listened = "02 - Listened",
	Skipped = "03 - Skipped",
}

export const BACKLOG_ITEM_STATUSES: BacklogItemStatus[] = [
	BacklogItemStatus.ToListen,
	BacklogItemStatus.Listened,
	BacklogItemStatus.Skipped,
];

function getFrontmatterValue(app: App, file: TFile, key: string): unknown {
	return app.metadataCache.getFileCache(file)?.frontmatter?.[key];
}

function getFrontmatterString(app: App, file: TFile, key: string): string | undefined {
	const value = getFrontmatterValue(app, file, key);
	return typeof value === "string" ? value : undefined;
}

// music-release is stored as a wikilink string in frontmatter, but tolerate
// array form too (mirrors how Obsidian's multi-valued fields behave).
function getFrontmatterWikilinks(app: App, file: TFile, key: string): string[] {
	const value = getFrontmatterValue(app, file, key);
	if (Array.isArray(value)) {
		return value.map(String);
	}
	return typeof value === "string" ? [value] : [];
}

export function getBacklogItems(app: App): TFile[] {
	return getFilesWithCategory(app, BACKLOG_ITEM_CATEGORY);
}

export function getBacklogItemsForRelease(app: App, releaseName: string): TFile[] {
	return getBacklogItems(app).filter((file) =>
		getFrontmatterWikilinks(app, file, "music-release").includes(
			`[[${releaseName}]]`,
		),
	);
}

export function getBacklogItemStatus(
	app: App,
	file: TFile,
): BacklogItemStatus | null {
	const status = getFrontmatterString(app, file, "status");
	return BACKLOG_ITEM_STATUSES.includes(status as BacklogItemStatus)
		? (status as BacklogItemStatus)
		: null;
}

export function getBacklogItemReleaseName(app: App, file: TFile): string | null {
	const link = getFrontmatterWikilinks(app, file, "music-release")[0];
	if (!link) return null;
	const name = link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
	return name.length > 0 ? name : null;
}

export async function setBacklogItemStatus(
	app: App,
	file: TFile,
	status: BacklogItemStatus,
): Promise<void> {
	const now = moment().format("YYYY-MM-DDTHH:mm:ss");
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["status"] = status;
		if (status === BacklogItemStatus.Listened) {
			fm["date-listened"] = now;
		} else if (status === BacklogItemStatus.Skipped) {
			fm["date-listened"] = null;
		}
	});
}

// Marks every "To Listen" backlog item for the release as listened, since the
// desire to listen has been fulfilled. Returns the number marked.
export async function markBacklogItemsListened(
	app: App,
	releaseName: string,
): Promise<number> {
	const items = getBacklogItemsForRelease(app, releaseName).filter(
		(file) => getBacklogItemStatus(app, file) === BacklogItemStatus.ToListen,
	);
	for (const item of items) {
		await setBacklogItemStatus(app, item, BacklogItemStatus.Listened);
	}
	return items.length;
}

// Marks every "To Listen" backlog item for the release as skipped. Returns the
// number marked.
export async function markBacklogItemsSkipped(
	app: App,
	releaseName: string,
): Promise<number> {
	const items = getBacklogItemsForRelease(app, releaseName).filter(
		(file) => getBacklogItemStatus(app, file) === BacklogItemStatus.ToListen,
	);
	for (const item of items) {
		await setBacklogItemStatus(app, item, BacklogItemStatus.Skipped);
	}
	return items.length;
}

// True when the release has at least one "To Listen" backlog item.
export function hasUnresolvedBacklogItems(
	app: App,
	releaseName: string,
): boolean {
	return getBacklogItemsForRelease(app, releaseName).some(
		(file) => getBacklogItemStatus(app, file) === BacklogItemStatus.ToListen,
	);
}