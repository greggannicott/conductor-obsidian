import { App } from "obsidian";
import {
	ConductorSelectorGrouping,
	ConductorSelectorMeta,
	ConductorSelectorModal,
	ConductorSelectorOptions,
} from "./conductor-selector-modal";
import { compareEpics, Epic, getEpics, getOutstandingEpics } from "./epics";
import { Context } from "./projects";
import { STATUS_EMOJI } from "./tasks";

const statusLabel = (epic: Epic): string => {
	if (!epic.status) return "No Status";
	const label = epic.status.replace(/^\d+ - /, "");
	const emoji = STATUS_EMOJI[epic.status];
	return emoji ? `${emoji} ${label}` : label;
};

// Rows show a single combined meta line, e.g. "Personal · 🔄 In Progress".
const epicMetaLine = (epic: Epic): string =>
	`${epic.context} · ${statusLabel(epic)}`;

const contextGrouping: ConductorSelectorGrouping<Epic> = {
	id: "context",
	label: "Group by Context",
	toggleKey: "c",
	buildGroups: (items) => {
		const buckets = new Map<string, Epic[]>();
		for (const item of items) {
			if (!buckets.has(item.context)) buckets.set(item.context, []);
			buckets.get(item.context)!.push(item);
		}
		return [...buckets.entries()]
			.sort(([headerA], [headerB]) => headerA.localeCompare(headerB))
			.map(([header, bucket]) => ({ header, items: bucket }));
	},
};

export function epicSelectorOptions(
	epics: Epic[],
): ConductorSelectorOptions<Epic> {
	return {
		items: [...epics].sort(compareEpics),
		// Dismissing the modal (Esc) means "no epic", so the optionality has to
		// be spelled out here.
		placeholder: "Select an epic (optional — Esc to skip)",
		emptyText: "No outstanding epics",
		getText: (epic) => epic.name,
		getMeta: (epic): ConductorSelectorMeta[] => [{ value: epicMetaLine(epic) }],
		sortItems: compareEpics,
		groupings: [contextGrouping],
		initialGroupingId: null,
	};
}

export function showEpicSelector(
	app: App,
	epics: Epic[],
): Promise<Epic | null> {
	return ConductorSelectorModal.show(app, epicSelectorOptions(epics));
}

// The required "which epic?" prompt, for commands that have to attach
// something to an epic. Every epic is offered — including closed ones — so an
// older epic can still be picked for a retrospective. A preselected epic
// pre-fills the search box, leaving Enter to confirm it.
export function showEpicSelectorSingle(
	app: App,
	preselectedEpic: Epic | null = null,
): Promise<Epic | null> {
	const epics = getEpics(app);
	// Only pre-fill when the epic is one of the offered rows: anything else
	// would filter the list down to nothing.
	const preselected = epics.find(
		(epic) => epic.path === preselectedEpic?.path,
	);
	return ConductorSelectorModal.show(app, {
		...epicSelectorOptions(epics),
		placeholder: "Select an epic...",
		emptyText: "No epics found",
		initialValue: preselected?.name,
	});
}

// The optional "which epic is this for?" prompt. Epics only group personal
// work, so a work project's task is never offered one. Nothing is asked when
// there are no outstanding epics to choose from either.
export async function promptForOptionalEpic(
	app: App,
	context: Context,
): Promise<Epic | null> {
	if (context !== Context.Personal) return null;

	const epics = getOutstandingEpics(app);
	if (epics.length === 0) return null;
	return showEpicSelector(app, epics);
}
