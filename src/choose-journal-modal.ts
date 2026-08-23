import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export type JournalEntry = {
	file: TFile;
	title: string;
	dateText: string;
	sortKey: number;
	topics: string[];
};

export function showJournalSelector(
	app: App,
	entries: JournalEntry[],
): Promise<JournalEntry | null> {
	return ConductorSelectorModal.show<JournalEntry>(app, {
		items: entries ?? [],
		placeholder: "Select a journal entry to link...",
		getText: (entry) => entry.title,
		getSearchText: (entry) =>
			entry.topics.length === 0
				? entry.title
				: `${entry.title} ${entry.topics.join(" ")}`,
		getSubtext: (entry) => entry.topics.join(", ") || null,
		sortItems: (a, b) => b.sortKey - a.sortKey,
		groupings: [
			{
				id: "day",
				label: "By Day",
				buildGroups: (groupEntries) => {
					const groups: {
						header: string;
						items: JournalEntry[];
					}[] = [];
					let currentDay = "";
					for (const entry of groupEntries) {
						if (entry.dateText !== currentDay) {
							currentDay = entry.dateText;
							groups.push({ header: currentDay, items: [] });
						}
						groups[groups.length - 1].items.push(entry);
					}
					return groups;
				},
			},
		],
	});
}
