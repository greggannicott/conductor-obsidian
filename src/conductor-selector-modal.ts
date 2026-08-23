import { App, prepareFuzzySearch, SuggestModal } from "obsidian";

export type ConductorSelectorGrouping<T> = {
	id: string;
	label: string;
	// Optional Cmd+<key> shortcut to make this the active grouping at runtime.
	toggleKey?: string;
	buildGroups: (items: T[]) => { header: string; items: T[] }[];
};

export type ConductorSelectorOptions<T> = {
	items: T[];
	placeholder?: string;
	emptyText?: string;
	getText: (item: T) => string;
	// Text the query is matched against; defaults to getText.
	getSearchText?: (item: T) => string;
	// Optional muted second line rendered beneath the text.
	getSubtext?: (item: T) => string | null;
	// Deterministic ordering for grouped views (applied after filtering).
	sortItems?: (a: T, b: T) => number;
	groupings?: ConductorSelectorGrouping<T>[];
	initialGroupingId?: string;
	onSelect?: (item: T) => void;
};

type ConductorSelectorEntry<T> =
	| {
			kind: "header";
			title: string;
	  }
	| {
			kind: "item";
			item: T;
	  };

export class ConductorSelectorModal<T> extends SuggestModal<
	ConductorSelectorEntry<T>
> {
	private options: ConductorSelectorOptions<T>;
	private activeGroupingId: string | null;
	private handleToggleKeydown: ((e: KeyboardEvent) => void) | null = null;
	// Set by show(); resolves with null when the modal closes without a selection.
	private resolveSelection: ((item: T | null) => void) | null = null;

	constructor(app: App, options: ConductorSelectorOptions<T>) {
		super(app);
		this.options = options;
		this.activeGroupingId =
			options.initialGroupingId ?? options.groupings?.[0]?.id ?? null;

		if (options.placeholder) this.setPlaceholder(options.placeholder);
		if (options.emptyText) this.emptyStateText = options.emptyText;
		this.updateInstructions();
	}

	onOpen(): void {
		super.onOpen();
		this.handleToggleKeydown = (e: KeyboardEvent) => {
			if (e.isComposing) return;
			// Only allow switching when not searching.
			if (this.inputEl.value.trim().length > 0) return;
			// Require Cmd (macOS) so normal typing works.
			if (!e.metaKey) return;

			const grouping = this.options.groupings?.find(
				(g) =>
					g.toggleKey &&
					e.key.toLowerCase() === g.toggleKey.toLowerCase(),
			);
			if (!grouping || grouping.id === this.activeGroupingId) return;

			e.preventDefault();
			this.activeGroupingId = grouping.id;
			this.updateInstructions();
			this.inputEl.dispatchEvent(new Event("input"));
		};
		this.inputEl.addEventListener("keydown", this.handleToggleKeydown);
	}

	onClose(): void {
		if (this.handleToggleKeydown) {
			this.inputEl.removeEventListener("keydown", this.handleToggleKeydown);
			this.handleToggleKeydown = null;
		}
		// Resolve even when closed without selecting (e.g. Esc) so awaited
		// callers are not left hanging; a prior onSelect resolve wins.
		this.resolveSelection?.(null);
		this.resolveSelection = null;
		super.onClose();
	}

	getSuggestions(query: string): ConductorSelectorEntry<T>[] {
		const q = query.trim();
		let items = [...(this.options.items ?? [])];

		if (q.length > 0) {
			const search = prepareFuzzySearch(q);
			const getSearchText =
				this.options.getSearchText ?? this.options.getText;
			items = items
				.map((item) => ({ item, result: search(getSearchText(item)) }))
				.filter((m): m is { item: T; result: NonNullable<typeof m.result> } =>
					Boolean(m.result),
				)
				.sort((a, b) => b.result.score - a.result.score)
				.map((m) => m.item);
		}

		const grouping = this.getActiveGrouping();
		if (!grouping) {
			return items.map((item) => ({ kind: "item" as const, item }));
		}

		// Grouped views keep a deterministic order rather than fuzzy rank.
		if (this.options.sortItems) {
			items.sort(this.options.sortItems);
		}

		const entries: ConductorSelectorEntry<T>[] = [];
		for (const group of grouping.buildGroups(items)) {
			if (group.items.length === 0) continue;
			entries.push({ kind: "header", title: group.header });
			for (const item of group.items) {
				entries.push({ kind: "item", item });
			}
		}
		return entries;
	}

	renderSuggestion(item: ConductorSelectorEntry<T>, el: HTMLElement): void {
		if (item.kind === "header") {
			el.addClass("conductor-suggest-header");
			el.setAttr("aria-disabled", "true");
			el.createDiv({ text: item.title });
			return;
		}

		el.createDiv({ text: this.options.getText(item.item) });

		const subtext = this.options.getSubtext?.(item.item);
		if (subtext) {
			el.createDiv({ text: subtext, cls: "conductor-suggest-subtext" });
		}
	}

	onChooseSuggestion(
		item: ConductorSelectorEntry<T>,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (item.kind === "header") return;
		this.options.onSelect?.(item.item);
		// SuggestModal doesn't close automatically unless we do it.
		evt.preventDefault();
		this.close();
	}

	static show<T>(
		app: App,
		options: Omit<ConductorSelectorOptions<T>, "onSelect">,
	): Promise<T | null> {
		return new Promise((resolve) => {
			const modal = new ConductorSelectorModal<T>(app, {
				...options,
				onSelect: (item) => resolve(item),
			});
			modal.resolveSelection = resolve;
			modal.open();
		});
	}

	private getActiveGrouping(): ConductorSelectorGrouping<T> | null {
		return (
			this.options.groupings?.find((g) => g.id === this.activeGroupingId) ??
			null
		);
	}

	private updateInstructions(): void {
		const instructions = (this.options.groupings ?? [])
			.filter((g) => g.toggleKey)
			.map((g) => ({
				command: `⌘-${g.toggleKey!.toUpperCase()}`,
				purpose: g.label,
			}));
		if (instructions.length > 0) this.setInstructions(instructions);
	}
}
