import { App, TFile, moment, parseFrontMatterStringArray } from "obsidian";
import {
	ConductorSelectorGrouping,
	ConductorSelectorOptions,
} from "./conductor-selector-modal";
import { getTopicNamesForNote } from "./topics";
import {
	BACKLOG_ITEM_STATUSES,
	getBacklogItemStatus,
} from "./backlog";

// Journal basenames look like "2026-08-21 1200 - Title" or "2026-02-15 1232 sprint at the end".
const JOURNAL_TITLE_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{4})(?: - )?(.*)$/;

type CategoryDisplayConfig = {
	getText: (app: App, file: TFile) => string;
	getSearchText?: (app: App, file: TFile) => string;
	getSearchTexts?: (app: App, file: TFile) => string[];
	getSubtext?: (app: App, file: TFile) => string | null;
	// Right-aligned value on the title line (e.g. a rating shown as stars).
	getTitleRightMeta?: (app: App, file: TFile) => string | null;
	getBadges?: (app: App, file: TFile) => string[];
	sortItems?: (app: App, a: TFile, b: TFile) => number;
	// While searching, order groups (and items within them) by match relevance
	// and move the strongest matching group to the top.
	rankGroupsByRelevance?: boolean;
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

// A person's type (e.g. Musician, Author), taken from the first `type`
// wikilink. Null when the note declares none.
export function getPersonType(app: App, file: TFile): string | null {
	return getFirstWikilinkValue(app, file, "type");
}

const personConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	sortItems: (app, a, b) => {
		const typeA = getPersonType(app, a) ?? "zzz";
		const typeB = getPersonType(app, b) ?? "zzz";
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
					const type = getPersonType(app, file) ?? "Other";
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

// --- Backlog Item config ---

const dateAddedValue = (app: App, file: TFile): number => {
	const date = getFrontmatterString(app, file, "date-added");
	if (!date) return 0;
	const value = moment(date, "YYYY-MM-DDTHH:mm:ss").valueOf();
	return Number.isFinite(value) ? value : 0;
};

const backlogItemConfig: CategoryDisplayConfig = {
	getText: (_app, file) => {
		const match = file.basename.match(JOURNAL_TITLE_PATTERN);
		return match?.[3]?.trim() || file.basename;
	},
	getSubtext: (app, file) => {
		const reason =
			getFrontmatterString(app, file, "reason-comment") ??
			getFrontmatterString(app, file, "reason");
		return reason ? reason : null;
	},
	getBadges: (app, file) => {
		const badges: string[] = [];
		const status = getBacklogItemStatus(app, file);
		if (status) badges.push(status);
		const dateAdded = getFrontmatterString(app, file, "date-added");
		if (dateAdded) badges.push(dateAdded.substring(0, 10));
		return badges;
	},
	sortItems: (app, a, b) => dateAddedValue(app, b) - dateAddedValue(app, a),
	getGroupings: (app) => [
		{
			id: "status",
			label: "By Status",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const status =
						getBacklogItemStatus(app, file) ?? "Unknown";
					if (!buckets.has(status)) buckets.set(status, []);
					buckets.get(status)!.push(file);
				}
				const statusRank =
					Object.fromEntries(
						BACKLOG_ITEM_STATUSES.map((s, i) => [s, i]),
					) as Record<string, number>;
				return [...buckets.entries()]
					.sort(([a], [b]) => {
						const ra = statusRank[a] ?? Number.MAX_SAFE_INTEGER;
						const rb = statusRank[b] ?? Number.MAX_SAFE_INTEGER;
						return ra - rb;
					})
					.map(([status, bucket]) => ({
						header: status,
						items: bucket.sort(
							(x, y) => dateAddedValue(app, x) - dateAddedValue(app, y),
						),
					}));
			},
		},
	],
};

// --- Wisdom config ---

const WISDOM_RATING_MAX = 5;
const WISDOM_NO_TOPIC_HEADER = "No Topic";

// Wisdom notes carry an optional 1-5 `rating` in frontmatter. Numeric strings
// are accepted too, since frontmatter imports sometimes quote the value.
function getWisdomRating(app: App, file: TFile): number | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.rating;
	const value =
		typeof raw === "number"
			? raw
			: typeof raw === "string"
				? Number(raw.trim())
				: NaN;
	if (!Number.isFinite(value) || value <= 0) return null;
	return Math.min(WISDOM_RATING_MAX, Math.round(value));
}

const wisdomConfig: CategoryDisplayConfig = {
	getText: (_app, file) => file.basename,
	// Topics are searchable as well as titles, so a note is found by what it's
	// about and not just by the words in its name. Each is a separate field, so
	// a query has to match one of them rather than span across them.
	getSearchTexts: (app, file) => [
		file.basename,
		...getTopicNamesForNote(app, file),
	],
	getSubtext: (app, file) => getTopicNamesForNote(app, file).join(", ") || null,
	getTitleRightMeta: (app, file) => {
		const rating = getWisdomRating(app, file);
		return rating ? "★".repeat(rating) : null;
	},
	sortItems: (_app, a, b) => a.basename.localeCompare(b.basename),
	// A search should surface the strongest match first, not leave it buried in
	// an alphabetically-ordered topic group.
	rankGroupsByRelevance: true,
	getGroupings: (app) => [
		{
			id: "topic",
			label: "By Topic",
			toggleKey: "t",
			buildGroups: (files) => {
				const buckets = new Map<string, TFile[]>();
				for (const file of files) {
					const topics = getTopicNamesForNote(app, file);
					// A note is listed under every topic it has, so it stays
					// discoverable from any of them. Untopiced notes still
					// need somewhere to live.
					const headers =
						topics.length > 0 ? topics : [WISDOM_NO_TOPIC_HEADER];
					for (const header of headers) {
						if (!buckets.has(header)) buckets.set(header, []);
						buckets.get(header)!.push(file);
					}
				}
				return [...buckets.entries()]
					.sort(([a], [b]) => {
						if (a === WISDOM_NO_TOPIC_HEADER) return 1;
						if (b === WISDOM_NO_TOPIC_HEADER) return -1;
						return a.localeCompare(b);
					})
					.map(([header, bucket]) => ({
						header,
						items: bucket.sort((x, y) =>
							x.basename.localeCompare(y.basename),
						),
					}));
			},
		},
		{
			id: "rating",
			label: "By Rating",
			toggleKey: "r",
			buildGroups: (files) => {
				const buckets = new Map<number, TFile[]>();
				const unrated: TFile[] = [];
				for (const file of files) {
					const rating = getWisdomRating(app, file);
					if (rating === null) {
						unrated.push(file);
						continue;
					}
					if (!buckets.has(rating)) buckets.set(rating, []);
					buckets.get(rating)!.push(file);
				}
				const sortByTitle = (x: TFile, y: TFile) =>
					x.basename.localeCompare(y.basename);
				const groups = [...buckets.entries()]
					.sort(([a], [b]) => b - a)
					.map(([rating, bucket]) => ({
						header: "★".repeat(rating),
						items: bucket.sort(sortByTitle),
					}));
				if (unrated.length > 0) {
					groups.push({
						header: "Unrated",
						items: unrated.sort(sortByTitle),
					});
				}
				return groups;
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
	"Backlog Item": backlogItemConfig,
	Wisdom: wisdomConfig,
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
		getSearchTexts: config.getSearchTexts
			? (file) => config.getSearchTexts!(app, file)
			: undefined,
		getSubtext: config.getSubtext
			? (file) => config.getSubtext!(app, file)
			: undefined,
		getTitleRightMeta: config.getTitleRightMeta
			? (file) => config.getTitleRightMeta!(app, file)
			: undefined,
		getBadges: config.getBadges
			? (file) => config.getBadges!(app, file)
			: undefined,
		sortItems: config.sortItems
			? (a, b) => config.sortItems!(app, a, b)
			: undefined,
		rankGroupsByRelevance: config.rankGroupsByRelevance,
		groupings: config.getGroupings?.(app),
	};
}
