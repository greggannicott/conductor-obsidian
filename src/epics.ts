import { App, TFile, parseFrontMatterStringArray } from "obsidian";
import { Context, ProjectStatus } from "./projects";
import {
	getFilesFromProjectsFolderWithCategory,
	isFileCategory,
} from "./utilities";

// Epics are categorised by "[[Epic (Category)]]" rather than "[[Epic]]":
// the latter is the label taxonomy note.
const EPIC_CATEGORY = "Epic (Category)";

export type Epic = {
	name: string;
	path: string;
	file: TFile;
	context: Context;
	status: ProjectStatus | "";
};

// Epics share the project/task status vocabulary. Anything that isn't closed
// is still outstanding, including the blank status a freshly created epic
// carries — otherwise a new epic would never appear in the pickers.
const CLOSED_EPIC_STATUSES: string[] = [
	ProjectStatus.Done,
	ProjectStatus.Abandoned,
	ProjectStatus.WontDo,
];

// Sort bands for the standard picker ordering: work in progress first, then
// things still to start, then the rest.
const EPIC_STATUS_RANK: Record<string, number> = {
	[ProjectStatus.InProgress]: 0,
	[ProjectStatus.ToDo]: 1,
	[ProjectStatus.WontDo]: 2,
	[ProjectStatus.Abandoned]: 3,
	[ProjectStatus.Done]: 4,
};

export function compareEpics(a: Epic, b: Epic): number {
	const rankA = EPIC_STATUS_RANK[a.status] ?? 5;
	const rankB = EPIC_STATUS_RANK[b.status] ?? 5;
	if (rankA !== rankB) return rankA - rankB;
	return a.name.localeCompare(b.name);
}

export function getEpicFromFile(app: App, file: TFile): Epic {
	const status = app.metadataCache.getFileCache(file)?.frontmatter?.status;
	return {
		name: file.basename,
		path: file.path,
		file,
		context: file.path.startsWith("Projects/Work")
			? Context.Work
			: Context.Personal,
		status: typeof status === "string" ? (status as ProjectStatus) : "",
	};
}

export function isNoteEpic(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	return isFileCategory(app, file, EPIC_CATEGORY);
}

// The epic named by a note's `epic` frontmatter property. Tasks are the usual
// carrier, but any note may hold the link.
export function getEpicFromFrontmatter(
	app: App,
	file: TFile,
): Epic | null {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const links = parseFrontMatterStringArray(frontmatter, "epic") ?? [];
	for (const link of links) {
		const epic = getEpicFromLink(app, link, file.path);
		if (epic) return epic;
	}
	return null;
}

// Resolves a frontmatter link to an epic note. Links to anything else are
// ignored so a stale or mistyped property never preselects a non-epic.
function getEpicFromLink(
	app: App,
	link: string,
	sourcePath: string,
): Epic | null {
	const name = link
		.replace(/^\[\[|\]\]$/g, "")
		.split("|")[0]
		.trim();
	if (!name) return null;
	const target = app.metadataCache.getFirstLinkpathDest(name, sourcePath);
	if (!target || !isNoteEpic(app, target)) return null;
	return getEpicFromFile(app, target);
}

// Every epic in the vault, whether or not it is still running.
export function getEpics(app: App): Epic[] {
	return getFilesFromProjectsFolderWithCategory(app, EPIC_CATEGORY)
		.map((file) => getEpicFromFile(app, file))
		.sort(compareEpics);
}

// Epics worth attaching new work to: not done, abandoned or won't do.
export function getOutstandingEpics(app: App): Epic[] {
	return getEpics(app).filter(
		(epic) => !CLOSED_EPIC_STATUSES.includes(epic.status),
	);
}
