import { App } from "obsidian";
import type {
	ConductorSelectorGrouping,
	ConductorSelectorMeta,
} from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	compareProjects,
	getProjectSearchFields,
	Project,
	ProjectStatus,
} from "./projects";
import { STATUS_EMOJI } from "./tasks";

// Display truncation length for project names in pickers.
export const PROJECT_TITLE_MAX_LENGTH = 120;

// The order non-ongoing status bands appear in, mirroring compareProjects.
const STATUS_BAND_ORDER: ProjectStatus[] = [
	ProjectStatus.InProgress,
	ProjectStatus.ToDo,
	ProjectStatus.Done,
	ProjectStatus.Abandoned,
	ProjectStatus.WontDo,
];

const statusLabel = (status: ProjectStatus): string =>
	status.replace(/^\d+ - /, "");

const statusDisplay = (status: ProjectStatus): string =>
	`${STATUS_EMOJI[status]} ${statusLabel(status)}`;

// Rows show a single combined meta line, e.g. "Work · 🔄 In Progress" or
// "Work · Ongoing" - a project's status is hidden while it is ongoing.
const projectMetaLine = (project: Project): string => {
	const context = project.context;
	if (project.ongoing) return `${context} · Ongoing`;
	if (project.status) return `${context} · ${statusDisplay(project.status)}`;
	return context;
};

// Grouping header for a project once its ongoing/status status is folded in,
// mirroring the meta line and the project selector sort bands.
const projectGroupKey = (project: Project): string => {
	if (project.ongoing) return "Ongoing";
	if (project.status) return statusDisplay(project.status);
	return "Unknown Status";
};

const statusGrouping: ConductorSelectorGrouping<Project> = {
	id: "status",
	label: "Group by Status",
	toggleKey: "s",
	buildGroups: (items) => {
		const buckets = new Map<string, Project[]>();
		for (const item of items) {
			const key = projectGroupKey(item);
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key)!.push(item);
		}
		const orderedHeaders = [
			"Ongoing",
			...STATUS_BAND_ORDER.map(statusDisplay),
			"Unknown Status",
		];
		return orderedHeaders
			.filter((header) => buckets.has(header))
			.map((header) => ({ header, items: buckets.get(header)! }));
	},
};

const contextGrouping: ConductorSelectorGrouping<Project> = {
	id: "context",
	label: "Group by Context",
	toggleKey: "c",
	buildGroups: (items) => {
		const buckets = new Map<string, Project[]>();
		for (const item of items) {
			if (!buckets.has(item.context)) buckets.set(item.context, []);
			buckets.get(item.context)!.push(item);
		}
		return [...buckets.entries()]
			.sort(([headerA], [headerB]) => headerA.localeCompare(headerB))
			.map(([header, bucket]) => ({ header, items: bucket }));
	},
};

// The standard project picker: active-first, alphabetical ordering, a jira id
// prefixed onto the name when present, and a single context/status/ongoing
// meta line. Opens on the flat list; Cmd+S groups by status (ongoing projects
// under their own "Ongoing" header) and Cmd+C groups by context. No covers -
// projects don't have any. Callers pass `initialValue` to prefill the search
// input (selected on open so it is easy to replace).
export function showProjectSelector(
	app: App,
	projects: Project[],
	initialValue?: string,
): Promise<Project | null> {
	return ConductorSelectorModal.show(app, {
		items: [...(projects ?? [])].sort(compareProjects),
		placeholder: "Select a project...",
		initialValue,
		titleMaxLength: PROJECT_TITLE_MAX_LENGTH,
		getText: (project) =>
			project.jiraId ? `${project.jiraId}: ${project.name}` : project.name,
		getSearchTexts: (project) => getProjectSearchFields(project),
		getMeta: (project): ConductorSelectorMeta[] => [
			{ value: projectMetaLine(project) },
		],
		sortItems: compareProjects,
		groupings: [statusGrouping, contextGrouping],
		initialGroupingId: null,
	});
}