import { App, prepareFuzzySearch, SuggestModal, TFile } from "obsidian";

export type JournalEntry = {
	file: TFile;
	title: string;
	dateText: string;
	sortKey: number;
	topics: string[];
};

type onChooseCallback = (entry: JournalEntry) => void;

type JournalModalItem =
	| {
			kind: "header";
			title: string;
	  }
	| {
			kind: "journal";
			journal: JournalEntry;
	  };

export class ChooseJournalModal extends SuggestModal<JournalModalItem> {
	public entries: JournalEntry[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a journal entry to link...");
	}

	getSuggestions(query: string): JournalModalItem[] {
		let matches = this.entries ?? [];

		const q = query.trim();
		if (q.length > 0) {
			const search = prepareFuzzySearch(q);
			matches = matches.filter((entry) => search(this.getEntryText(entry)));
		}

		return this.getGroupedItems(matches);
	}

	renderSuggestion(item: JournalModalItem, el: HTMLElement): void {
		if (item.kind === "header") {
			el.addClass("conductor-suggest-header");
			el.setAttr("aria-disabled", "true");
			el.createDiv({ text: item.title });
			return;
		}

		el.createDiv({ text: item.journal.title });
		el.createDiv({
			text: item.journal.topics.join(", "),
			cls: "conductor-suggest-subtext",
		});
	}

	onChooseSuggestion(
		item: JournalModalItem,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (item.kind === "header") return;
		this.onChoose(item.journal);
		// SuggestModal doesn't close automatically unless we do it.
		evt.preventDefault();
		this.close();
	}

	private getEntryText(entry: JournalEntry): string {
		if (entry.topics.length === 0) return entry.title;
		return `${entry.title} ${entry.topics.join(" ")}`;
	}

	private getGroupedItems(entries: JournalEntry[]): JournalModalItem[] {
		const sorted = [...entries].sort((a, b) => b.sortKey - a.sortKey);

		const items: JournalModalItem[] = [];
		let currentDay = "";
		for (const entry of sorted) {
			if (entry.dateText !== currentDay) {
				currentDay = entry.dateText;
				items.push({ kind: "header", title: currentDay });
			}
			items.push({ kind: "journal", journal: entry });
		}
		return items;
	}
}
