import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	Experiment,
	ExperimentKind,
	getExperiments,
} from "./experiments";

const kindOrder: Record<ExperimentKind, number> = {
	short: 0,
	long: 1,
	other: 2,
};

const kindLabel: Record<ExperimentKind, string> = {
	short: "Short",
	long: "Long",
	other: "Other",
};

const statusOrder: string[] = [
	"Proposed",
	"On Hold",
	"Ongoing",
	"Finished",
	"Will Not Do",
];

// Short before long before other, then name. Applied globally so grouped
// views inherit both the header order and the within-group order.
const compareExperiments = (a: Experiment, b: Experiment): number => {
	const ka = kindOrder[a.kind];
	const kb = kindOrder[b.kind];
	if (ka !== kb) return ka - kb;
	return a.name.localeCompare(b.name);
};

const typeGrouping = {
	id: "type",
	label: "Group by Type",
	toggleKey: "t",
	buildGroups: (experiments: Experiment[]) => {
		const buckets = new Map<ExperimentKind, Experiment[]>();
		for (const experiment of experiments) {
			if (!buckets.has(experiment.kind)) {
				buckets.set(experiment.kind, []);
			}
			buckets.get(experiment.kind)!.push(experiment);
		}
		return [...buckets.entries()]
			.sort(([kindA], [kindB]) => kindOrder[kindA] - kindOrder[kindB])
			.map(([kind, bucket]) => ({
				header: kindLabel[kind],
				items: bucket,
			}));
	},
};

const statusGrouping = {
	id: "status",
	label: "Group by Status",
	toggleKey: "s",
	buildGroups: (experiments: Experiment[]) => {
		const buckets = new Map<string, Experiment[]>();
		for (const experiment of experiments) {
			const key = experiment.status ?? "Unknown";
			if (!buckets.has(key)) {
				buckets.set(key, []);
			}
			buckets.get(key)!.push(experiment);
		}
		return statusOrder
			.filter((header) => buckets.has(header))
			.map((header) => ({ header, items: buckets.get(header)! }))
			.concat(
				[...buckets.keys()]
					.filter((header) => !statusOrder.includes(header))
					.sort((a, b) => a.localeCompare(b))
					.map((header) => ({ header, items: buckets.get(header)! })),
			);
	},
};

const experimentGroupings = [typeGrouping, statusGrouping];

export function showExperimentSelector(
	app: App,
	preselectedFiles: TFile[] = [],
): Promise<Experiment[]> {
	// Selector items are freshly built objects, so match preselection by path.
	const items = getExperiments(app);
	const preselectedPaths = new Set(preselectedFiles.map((f) => f.path));
	return ConductorSelectorModal.showMulti<Experiment>(app, {
		items,
		placeholder: "Filter experiments by name...",
		emptyText: "No experiment notes found",
		getText: (experiment) => experiment.name,
		getTitleRightMeta: (experiment, ctx) => {
			const groupingId = ctx?.activeGrouping ?? "type";
			if (groupingId === "status") {
				return kindLabel[experiment.kind];
			}
			return experiment.status ?? null;
		},
		initialSelection: items.filter((e) => preselectedPaths.has(e.path)),
		sortItems: compareExperiments,
		groupings: experimentGroupings,
		initialGroupingId: "type",
	});
}

export function showExperimentSelectorSingle(
	app: App,
	preselectedFile?: TFile,
): Promise<Experiment | null> {
	const items = getExperiments(app);
	const preselectedPaths = new Set(
		preselectedFile ? [preselectedFile.path] : [],
	);
	return ConductorSelectorModal.show<Experiment>(app, {
		items,
		placeholder: "Filter experiments by name...",
		emptyText: "No experiment notes found",
		getText: (experiment) => experiment.name,
		getTitleRightMeta: (experiment, ctx) => {
			const groupingId = ctx?.activeGrouping ?? "type";
			if (groupingId === "status") {
				return kindLabel[experiment.kind];
			}
			return experiment.status ?? null;
		},
		initialSelection: items.filter((e) => preselectedPaths.has(e.path)),
		sortItems: compareExperiments,
		groupings: experimentGroupings,
		initialGroupingId: "type",
	});
}
