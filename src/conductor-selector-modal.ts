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
	// Optional trailing badges rendered at the end of the row (e.g. emojis).
	getBadges?: (item: T) => string[];
	// Deterministic ordering for grouped views (applied after filtering).
	sortItems?: (a: T, b: T) => number;
	// The first grouping is the default (active on open). By convention the
	// caller orders the array accordingly.
	groupings?: ConductorSelectorGrouping<T>[];
	// Multi-select mode: click or Cmd/Ctrl+Space toggles items, Enter confirms
	// the selection set. Only meaningful via showMulti().
	multiSelect?: boolean;
	// Multi-select only: items already checked when the modal opens.
	initialSelection?: T[];
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
	// Set by showMulti(); resolves with [] when the modal closes without confirming.
	private resolveMultiSelection: ((items: T[]) => void) | null = null;
	private readonly multiSelect: boolean;
	private selectedItems: Set<T> = new Set();
	private itemByElement = new WeakMap<HTMLElement, T>();
	private suggestionListEl: HTMLElement | null = null;

	constructor(app: App, options: ConductorSelectorOptions<T>) {
		super(app);
		this.modalEl.addClass("conductor-selector-modal");
		this.options = options;
		this.multiSelect = options.multiSelect ?? false;
		this.activeGroupingId = options.groupings?.[0]?.id ?? null;
		for (const item of options.initialSelection ?? []) {
			this.selectedItems.add(item);
		}

		if (options.placeholder) this.setPlaceholder(options.placeholder);
		if (options.emptyText) this.emptyStateText = options.emptyText;
		this.updateInstructions();
	}

	onOpen(): void {
		super.onOpen();
		this.applyInstructionHighlight();
		this.handleToggleKeydown = (e: KeyboardEvent) => {
			if (e.isComposing) return;

			if (
				this.multiSelect &&
				(e.ctrlKey || e.metaKey) &&
				e.code === "Space"
			) {
				e.preventDefault();
				this.toggleHighlightedSelection();
				return;
			}

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
		// Obsidian closes the modal BEFORE invoking onChooseSuggestion, so a
		// selection may still land after onClose. Defer the fallback resolve
		// by one macrotask; choosing nulls the resolvers first and wins.
		setTimeout(() => {
			this.resolveSelection?.(null);
			this.resolveSelection = null;
			this.resolveMultiSelection?.([]);
			this.resolveMultiSelection = null;
		}, 0);
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

		// Track the list container and element->item mapping so multi-select
		// can find and toggle whatever row is currently highlighted.
		this.suggestionListEl = el.parentElement;
		this.itemByElement.set(el, item.item);

		const row = el.createDiv({ cls: "conductor-suggest-row" });

		if (this.multiSelect) {
			const isSelected = this.selectedItems.has(item.item);
			row.createSpan({
				cls: "conductor-suggest-check",
				text: isSelected ? "☑" : "☐",
			});
			if (isSelected) el.addClass("conductor-suggest-selected");
		}

		row.createSpan({ text: this.options.getText(item.item) });

		const subtext = this.options.getSubtext?.(item.item);
		if (subtext) {
			el.createDiv({ text: subtext, cls: "conductor-suggest-subtext" });
		}

		const badges = this.options.getBadges?.(item.item);
		if (badges && badges.length > 0) {
			row.createSpan({
				cls: "conductor-suggest-badges",
				text: badges.join(" "),
			});
		}
	}

	onChooseSuggestion(
		item: ConductorSelectorEntry<T>,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (item.kind === "header") {
			// Obsidian highlights index 0 without skipping disabled rows, so
			// keyboard Enter can land on a group header. Treat it as a confirm
			// of the selection set; clicking headers does nothing.
			if (this.multiSelect && !(evt instanceof MouseEvent)) {
				this.confirmMultiSelection(evt, null);
			}
			return;
		}

		if (this.multiSelect) {
			// Clicking a row toggles it without closing; Enter (or any
			// keyboard chooser) confirms the selection set.
			if (evt instanceof MouseEvent) {
				const el = evt.currentTarget;
				this.toggleItemSelection(
					el instanceof HTMLElement ? el : null,
					item.item,
				);
				return;
			}
			this.confirmMultiSelection(evt, item.item);
			return;
		}

		this.resolveSelection = null;
		this.options.onSelect?.(item.item);
		// SuggestModal doesn't close automatically unless we do it.
		evt.preventDefault();
		this.close();
	}

	private confirmMultiSelection(
		evt: KeyboardEvent,
		highlighted: T | null,
	): void {
		const chosen = [...this.selectedItems];
		if (chosen.length === 0 && highlighted) chosen.push(highlighted);
		if (chosen.length === 0) {
			const first = this.firstRenderedItem();
			if (!first) return;
			chosen.push(first);
		}

		const resolve = this.resolveMultiSelection;
		this.resolveMultiSelection = null;
		resolve?.(chosen);
		// SuggestModal doesn't close automatically unless we do it.
		evt.preventDefault();
		this.close();
	}

	private firstRenderedItem(): T | null {
		const el = this.suggestionListEl?.querySelector<HTMLElement>(
			".suggestion-item:not(.conductor-suggest-header)",
		);
		return el ? (this.itemByElement.get(el) ?? null) : null;
	}

	static show<T>(
		app: App,
		options: Omit<ConductorSelectorOptions<T>, "onSelect" | "multiSelect">,
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

	static showMulti<T>(
		app: App,
		options: Omit<ConductorSelectorOptions<T>, "onSelect" | "multiSelect">,
	): Promise<T[]> {
		return new Promise((resolve) => {
			const modal = new ConductorSelectorModal<T>(app, {
				...options,
				multiSelect: true,
			});
			modal.resolveMultiSelection = resolve;
			modal.open();
		});
	}

	private getActiveGrouping(): ConductorSelectorGrouping<T> | null {
		return (
			this.options.groupings?.find((g) => g.id === this.activeGroupingId) ??
			null
		);
	}

	private toggleHighlightedSelection(): void {
		const el = this.suggestionListEl?.querySelector<HTMLElement>(
			".suggestion-item.is-selected",
		);
		const item = el ? this.itemByElement.get(el) : undefined;
		if (!item) return;
		this.toggleItemSelection(el ?? null, item);
	}

	private toggleItemSelection(el: HTMLElement | null, item: T): void {
		const nowSelected = !this.selectedItems.has(item);
		if (nowSelected) {
			this.selectedItems.add(item);
		} else {
			this.selectedItems.delete(item);
		}

		if (el) {
			el.toggleClass("conductor-suggest-selected", nowSelected);
			const check = el.querySelector(".conductor-suggest-check");
			if (check) check.textContent = nowSelected ? "☑" : "☐";
		}
	}

	private updateInstructions(): void {
		const instructions = (this.options.groupings ?? [])
			.filter((g) => g.toggleKey)
			.map((g) => ({
				command: `⌘-${g.toggleKey!.toUpperCase()}`,
				purpose: g.label,
			}));
		if (this.multiSelect) {
			instructions.push(
				{ command: "⌘/ctrl space", purpose: "toggle" },
				{ command: "↵", purpose: "confirm selection" },
			);
		}
		if (instructions.length > 0) this.setInstructions(instructions);
		this.applyInstructionHighlight();
	}

	private applyInstructionHighlight(): void {
		const groupings = (this.options.groupings ?? []).filter(
			(g) => g.toggleKey,
		);
		if (groupings.length === 0) return;
		const els =
			this.containerEl.querySelectorAll<HTMLElement>(".prompt-instruction");
		groupings.forEach((g, i) => {
			const el = els[i];
			if (!el) return;
			el.toggleClass(
				"conductor-instruction-active",
				g.id === this.activeGroupingId,
			);
		});
	}
}
