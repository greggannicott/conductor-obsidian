import { App, Notice, TFile, parseFrontMatterStringArray } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getFilesWithCategory } from "src/utilities";

type OpenRandomOption = {
	title: string;
	category?: string;
	tag?: string;
	highRating?: boolean;
};

const pickRandom = <T,>(items: T[]): T =>
	items[Math.floor(Math.random() * items.length)];

const openRandomFile = async (app: App, file: TFile): Promise<void> => {
	await app.workspace.getLeaf(false).openFile(file);
};

// A tag can live in frontmatter (`tags: [review]`) or inline in the body
// (`#review`), so match either.
const getFilesWithTag = (app: App, tagName: string): TFile[] =>
	app.vault.getMarkdownFiles().filter((file) => {
		if (file.path.startsWith("_templates/")) return false;
		const cache = app.metadataCache.getFileCache(file);
		const frontmatterTags =
			parseFrontMatterStringArray(cache?.frontmatter, "tags") ?? [];
		if (frontmatterTags.includes(tagName)) return true;
		return (cache?.tags ?? []).some((t) => t.tag === `#${tagName}`);
	});

const getFilesWithHighRating = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((file) => {
		if (file.path.startsWith("_templates/")) return false;
		const rating =
			app.metadataCache.getFileCache(file)?.frontmatter?.rating;
		return (
			typeof rating === "number" && (rating === 4 || rating === 5)
		);
	});

const getOptionFiles = (app: App, option: OpenRandomOption): TFile[] => {
	if (option.category) return getFilesWithCategory(app, option.category);
	if (option.tag) return getFilesWithTag(app, option.tag);
	if (option.highRating) return getFilesWithHighRating(app);
	throw new Error("OpenRandomOption has no matcher");
};

export const openRandom = async (app: App): Promise<void> => {
	const options: OpenRandomOption[] = [
		{ title: "Journal Entry", category: "Journal" },
		{ title: "Musing", category: "Musing" },
		{ title: "Quote", category: "Quote" },
		{ title: "Wisdom Note", category: "Wisdom" },
		{ title: "Goal", category: "Goal" },
		{ title: "Habit", category: "Habit" },
		{ title: "Identity", category: "Identity" },
		{ title: "List", category: "List" },
		{ title: "Note Containing a Review", tag: "review" },
		{ title: "Note With a High Rating", highRating: true },
		{ title: "Person", category: "Person" },
		{ title: "Slogan", category: "Slogan" },
	];

	const option = await ConductorSelectorModal.show(app, {
		items: options,
		placeholder: "Select what to open...",
		emptyText: "No options available",
		getText: (o) => o.title,
		sortItems: (a, b) => a.title.localeCompare(b.title),
	});
	if (!option) return;

	const files = getOptionFiles(app, option);
	if (files.length === 0) {
		new Notice(`No notes found for "${option.title}"`);
		return;
	}

	await openRandomFile(app, pickRandom(files));
};
