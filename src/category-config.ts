import { App, TFile, moment, parseFrontMatterStringArray } from "obsidian";
import {
	ConductorSelectorGrouping,
	ConductorSelectorOptions,
} from "./conductor-selector-modal";
import { getTopicNamesForNote } from "./topics";

// Journal basenames look like "2026-08-21 1200 - Title" or "2026-02-15 1232 sprint at the end".
const JOURNAL_TITLE_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{4})(?: - )?(.*)$/;

type CategoryDisplayConfig = {
	getText: (app: App, file: TFile) => string;
	getSearchText?: (app: App, file: TFile) => string;
	getSubtext?: (app: App, file: TFile) => string | null;
	getBadges?: (app: App, file: TFile) => string[];
	sortItems?: (app: App, a: TFile, b: TFile) => number;
	getGroupings?: (app: App) => ConductorSelectorGrouping<TFile>[];
};

function stripWikilink(link: string): string {
	return link.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
}

function getFrontmatterArray(
	app: App,
	file: TFile,
	key: string,
): string[] {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	return parseFrontMatterStringArray(frontmatter, key) ?? [];
}

function getFrontmatterString(
	app: App,
	file: TFile,
	key: string,
): string | undefined {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const value = frontmatter?.[key];
	return typeof value === "string" ? value : undefined;
}

// --- Default config ---

const defaultConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	sortItems: (_app, a, b) => a.basename.localeCompare(b.basename),
};

// --- Journal config ---

const journalConfig: CategoryDisplayConfig = {
	getText: (_app, file) => {
		const match = file.basename.match(JOURNAL_TITLE_PATTERN);
		return match?.[3]?.trim() || file.basename;
	},
	getSearchText: (app, file) => {
		const match = file.basename.match(JOURNAL_TITLE_PATTERN);
		const title = match?.[3]?.trim() || file.basename;
		const topics = getTopicNamesForNote(app, file);
		return topics.length === 0 ? title : `${title} ${topics.join(" ")}`;
	},
	getSubtext: (app, file) => {
		const topics = getTopicNamesForNote(app, file);
		return topics.join(", ") || null;
	},
	sortItems: (_app, a, b) => {
		const matchA = a.basename.match(JOURNAL_TITLE_PATTERN);
		const matchB = b.basename.match(JOURNAL_TITLE_PATTERN);
		if (!matchA || !matchB) return a.basename.localeCompare(b.basename);
		const sortA = moment(`${matchA[1]} ${matchA[2]}`, "YYYY-MM-DD HHmm").valueOf();
		const sortB = moment(`${matchB[1]} ${matchB[2]}`, "YYYY-MM-DD HHmm").valueOf();
		return sortB - sortA;
	},
	getGroupings: (_app) => [
		{
			id: "day",
			label: "By Day",
			buildGroups: (files) => {
				const groups: { header: string; items: TFile[] }[] = [];
				let currentDay = "";
				for (const file of files) {
					const match = file.basename.match(JOURNAL_TITLE_PATTERN);
					const dateText = match
						? moment(match[1]).format("dddd D MMMM YYYY")
						: "Unknown Date";
					if (dateText !== currentDay) {
						currentDay = dateText;
						groups.push({ header: currentDay, items: [] });
					}
					groups[groups.length - 1].items.push(file);
				}
				return groups;
			},
		},
	],
};

// --- Experiment config ---

type ExperimentKind = "short" | "long" | "other";

const experimentKindOrder: Record<ExperimentKind, number> = {
	short: 0,
	long: 1,
	other: 2,
};

const experimentKindLabel: Record<ExperimentKind, string> = {
	short: "Short",
	long: "Long",
	other: "Other",
};

function getExperimentKind(app: App, file: TFile): ExperimentKind {
	const types = getFrontmatterArray(app, file, "type");
	for (const link of types) {
		const value = stripWikilink(link);
		if (value === "Short Experiment") return "short";
		if (value === "Long Experiment") return "long";
	}
	return "other";
}

const experimentConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	sortItems: (app, a, b) => {
		const ka = experimentKindOrder[getExperimentKind(app, a)];
		const kb = experimentKindOrder[getExperimentKind(app, b)];
		if (ka !== kb) return ka - kb;
		return a.basename.localeCompare(b.basename);
	},
	getGroupings: (app) => [
		{
			id: "type",
			label: "By Type",
			buildGroups: (files) => {
				const buckets = new Map<ExperimentKind, TFile[]>();
				for (const file of files) {
					const kind = getExperimentKind(app, file);
					if (!buckets.has(kind)) buckets.set(kind, []);
					buckets.get(kind)!.push(file);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => experimentKindOrder[a] - experimentKindOrder[b])
					.map(([kind, bucket]) => ({
						header: experimentKindLabel[kind],
						items: bucket.sort((x, y) => x.basename.localeCompare(y.basename)),
					}));
			},
		},
	],
};

// --- Person config ---

function getFirstWikilinkValue(app: App, file: TFile, key: string): string | null {
	const values = getFrontmatterArray(app, file, key);
	for (const link of values) {
		const stripped = stripWikilink(link);
		if (stripped) return stripped;
	}
	return null;
}

const personConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	sortItems: (app, a, b) => {
		const typeA = getFirstWikilinkValue(app, a, "type") ?? "zzz";
		const typeB = getFirstWikilinkValue(app, b, "type") ?? "zzz";
		if (typeA !== typeB) return typeA.localeCompare(typeB);
		return a.basename.localeCompare(b.basename);
	},
	getGroupings: (app) => [
		{
			id: "type",
			label: "By Type",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const type = getFirstWikilinkValue(app, file, "type") ?? "Other";
					if (!buckets.has(type)) buckets.set(type, []);
					buckets.get(type)!.push(file);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([type, bucket]) => ({
						header: type,
						items: bucket.sort((x, y) => x.basename.localeCompare(y.basename)),
					}));
			},
		},
	],
};

// --- Event config ---

const eventDateSort = (app: App, a: TFile, b: TFile): number => {
	const dateA = getFrontmatterString(app, a, "date-of-event") ?? "9999-99-99";
	const dateB = getFrontmatterString(app, b, "date-of-event") ?? "9999-99-99";
	return dateA.localeCompare(dateB);
};

const eventConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	getBadges: (app, file) => {
		const badges: string[] = [];
		const dateOfEvent = getFrontmatterString(app, file, "date-of-event");
		if (dateOfEvent) badges.push(dateOfEvent);
		const cities = getFrontmatterArray(app, file, "city");
		for (const city of cities) {
			const stripped = stripWikilink(city);
			if (stripped) badges.push(stripped);
		}
		return badges;
	},
	sortItems: (app, a, b) => eventDateSort(app, a, b),
	getGroupings: (app) => [
		{
			id: "type",
			label: "Group by Type",
			toggleKey: "t",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const type = getFirstWikilinkValue(app, file, "type") ?? "Other";
					if (!buckets.has(type)) buckets.set(type, []);
					buckets.get(type)!.push(file);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([type, bucket]) => ({
						header: type,
						items: bucket.sort((x, y) => eventDateSort(app, x, y)),
					}));
			},
		},
		{
			id: "year",
			label: "Group by Year",
			toggleKey: "y",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const date = getFrontmatterString(app, file, "date-of-event");
					const year = date ? date.substring(0, 4) : "Unknown";
					if (!buckets.has(year)) buckets.set(year, []);
					buckets.get(year)!.push(file);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => b.localeCompare(a))
					.map(([year, bucket]) => ({
						header: year,
						items: bucket.sort((x, y) => eventDateSort(app, x, y)),
					}));
			},
		},
		{
			id: "city",
			label: "Group by City",
			toggleKey: "c",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const city = getFirstWikilinkValue(app, file, "city") ?? "Unknown";
					if (!buckets.has(city)) buckets.set(city, []);
					buckets.get(city)!.push(file);
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([city, bucket]) => ({
						header: city,
						items: bucket.sort((x, y) => eventDateSort(app, x, y)),
					}));
			},
		},
	],
};

// --- Config lookup ---

const CATEGORY_CONFIGS: Record<string, CategoryDisplayConfig> = {
	Journal: journalConfig,
	Experiment: experimentConfig,
	Person: personConfig,
	Event: eventConfig,
};

function getCategoryDisplayConfig(category: string): CategoryDisplayConfig {
	return CATEGORY_CONFIGS[category] ?? defaultConfig;
}

// --- Shared selector builder ---

export function buildCategoryNoteSelector(
	app: App,
	category: string,
	files: TFile[],
	currentFile?: TFile | null,
): ConductorSelectorOptions<TFile> {
	const config = getCategoryDisplayConfig(category);
	const filtered = currentFile
		? files.filter((f) => f.path !== currentFile.path)
		: files;

	return {
		items: filtered,
		placeholder: `Select a ${category.toLowerCase()} note...`,
		emptyText: `No ${category.toLowerCase()} notes found`,
		getText: (file) => config.getText(app, file),
		getSearchText: config.getSearchText
			? (file) => config.getSearchText!(app, file)
			: undefined,
		getSubtext: config.getSubtext
			? (file) => config.getSubtext!(app, file)
			: undefined,
		getBadges: config.getBadges
			? (file) => config.getBadges!(app, file)
			: undefined,
		sortItems: config.sortItems
			? (a, b) => config.sortItems!(app, a, b)
			: undefined,
		groupings: config.getGroupings?.(app),
	};
}
