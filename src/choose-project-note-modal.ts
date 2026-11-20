import { App, TFile } from "obsidian";
import {
	ConductorSelectorModal,
	ConductorSelectorOptions,
} from "./conductor-selector-modal";
import { getFilesWithCategory, getNoteTitle } from "./utilities";

export type ProjectNoteChoice =
	| { kind: "create" }
	| { kind: "note"; file: TFile };

// A sentinel row that, when selected, tells the caller to run the full
// "Create New Project Note" flow instead of inserting an existing note.
const CREATE_ITEM: ProjectNoteChoice = { kind: "create" };

export function projectNoteSelectorOptions(
	app: App,
	options: { includeCreate?: boolean } = {},
): ConductorSelectorOptions<ProjectNoteChoice> {
	const includeCreate = options.includeCreate ?? true;
	const files = getFilesWithCategory(app, "Project Note");

	const items: ProjectNoteChoice[] = [];
	if (includeCreate) items.push(CREATE_ITEM);
	items.push(...files.map((file) => ({ kind: "note" as const, file })));

	const groups = [
		...(includeCreate
			? [
					{
						id: "actions",
						label: "Actions",
						buildGroups: (entries: ProjectNoteChoice[]) => {
							const create = entries.filter(
								(e) => e.kind === "create",
							);
							return create.length
								? [{ header: "Actions", items: create }]
								: [];
						},
					},
			  ]
			: []),
		{
			id: "project",
			label: "By Project",
			buildGroups: (entries: ProjectNoteChoice[]) => {
				const buckets = new Map<string, ProjectNoteChoice[]>();
				for (const entry of entries) {
					if (entry.kind !== "note") continue;
					const parent = getProjectName(app, entry.file);
					const key = parent ?? "No Project";
					if (!buckets.has(key)) buckets.set(key, []);
					buckets.get(key)!.push(entry);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([header, bucket]) => ({ header, items: bucket }));
			},
		},
		{
			id: "type",
			label: "By Type",
			buildGroups: (entries: ProjectNoteChoice[]) => {
				const buckets = new Map<string, ProjectNoteChoice[]>();
				for (const entry of entries) {
					if (entry.kind !== "note") continue;
					const type = getProjectNoteType(app, entry.file) ?? "Other";
					if (!buckets.has(type)) buckets.set(type, []);
					buckets.get(type)!.push(entry);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([header, bucket]) => ({ header, items: bucket }));
			},
		},
	];

	return {
		items,
		placeholder: "Select a project note...",
		titleMaxLength: 120,
		getText: (entry) =>
			entry.kind === "create"
				? "Create New Project Note"
				: getNoteTitle(app, entry.file),
		getSearchTexts: (entry) => {
			if (entry.kind === "create") return ["create", "new", "project note"];
			const file = entry.file;
			const searches = [getNoteTitle(app, file), file.basename];
			searches.push(...getLinkedNames(app, file, "parents"));
			const type = getProjectNoteType(app, file);
			if (type) searches.push(type);
			return searches;
		},
		getMeta: (entry) => {
			if (entry.kind === "create") {
				return [{ value: "Create a new project note" }];
			}
			const type = getProjectNoteType(app, entry.file);
			const project = getProjectName(app, entry.file);
			const meta = [];
			if (project) meta.push({ value: project });
			if (type) meta.push({ value: type });
			return meta.length ? meta : null;
		},
		sortItems: (a, b) => {
			// Keep the create row pinned to the top.
			if (a.kind === "create" && b.kind !== "create") return -1;
			if (b.kind === "create" && a.kind !== "create") return 1;
			if (a.kind === "note" && b.kind === "note") {
				return getNoteTitle(app, a.file).localeCompare(
					getNoteTitle(app, b.file),
				);
			}
			return 0;
		},
		groupings: groups,
		initialGroupingId: null,
	};
}

export function showProjectNoteSelector(
	app: App,
	options: { includeCreate?: boolean } = {},
): Promise<ProjectNoteChoice | null> {
	return ConductorSelectorModal.show(
		app,
		projectNoteSelectorOptions(app, options),
	);
}

function getProjectName(app: App, file: TFile): string | null {
	const parents = getLinkedNames(app, file, "parents");
	if (!parents.length) return null;
	// Best-effort: strip wikilink wrappers already done by getLinkedNames.
	return parents[0];
}

function getProjectNoteType(app: App, file: TFile): string | null {
	const fm = app.metadataCache.getFileCache(file)?.frontmatter;
	const type = fm?.type;
	if (Array.isArray(type)) return typeof type[0] === "string" ? type[0].replace(/^\[\[|\]\]$/g, "") : null;
	if (typeof type === "string") return type.replace(/^\[\[|\]\]$/g, "");
	return null;
}

function getLinkedNames(app: App, file: TFile, field: string): string[] {
	const value = app.metadataCache.getFileCache(file)?.frontmatter?.[field];
	if (!Array.isArray(value)) return [];
	return value.map((name) =>
		String(name).replace(/^\[\[|\]\]$/g, "").split("|")[0].trim(),
	);
}
