import { App, TFile } from "obsidian";
import { Context, ProjectStatus } from "./projects";
import { getFilesFromProjectsFolderWithCategory } from "./utilities";

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
