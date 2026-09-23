import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { getFilesWithCategory } from "src/utilities";

const pickRandom = <T,>(items: T[]): T =>
	items[Math.floor(Math.random() * items.length)];

const openRandomFile = async (app: App, file: TFile): Promise<void> => {
	await app.workspace.getLeaf(false).openFile(file);
};

export const openRandom = async (app: App): Promise<void> => {
	const options: { title: string; category: string }[] = [
		{ title: "Journal Entry", category: "Journal" },
		{ title: "Musing", category: "Musing" },
		{ title: "Quote", category: "Quote" },
		{ title: "Wisdom Note", category: "Wisdom" },
		{ title: "Goal", category: "Goal" },
		{ title: "Habit", category: "Habit" },
		{ title: "Identity", category: "Identity" },
		{ title: "List", category: "List" },
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

	const files = getFilesWithCategory(app, option.category);
	if (files.length === 0) {
		new Notice(`No notes found for category "${option.category}"`);
		return;
	}

	await openRandomFile(app, pickRandom(files));
};
