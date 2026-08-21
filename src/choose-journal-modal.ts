import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export type JournalEntry = {
	file: TFile;
	title: string;
	dateText: string;
	sortKey: number;
	topics: string[];
};

type onChooseCallback = (entry: JournalEntry) => void;

export class ChooseJournalModal {
	public entries: JournalEntry[];
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<JournalEntry>(this.app, {
			items: this.entries ?? [],
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
					buildGroups: (entries) => {
						const groups: {
							header: string;
							items: JournalEntry[];
						}[] = [];
						let currentDay = "";
						for (const entry of entries) {
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
			onSelect: (entry) => this.onChoose(entry),
		}).open();
	}
}
