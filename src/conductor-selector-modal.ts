import { App, prepareFuzzySearch, SuggestModal } from "obsidian";

// A single key/value pair rendered beneath a suggestion's title. Omit `label`
// to display just the value.
export type ConductorSelectorMeta = {
	label?: string;
	value: string;
};

const META_VALUE_MAX_LENGTH = 40;

// Display-only truncation of a value (searching always uses the full text from
// getSearchTexts/getSearchText, never the rendered string).
function truncateText(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return value.slice(0, maxLength - 3) + "...";
}

function truncateMetaValue(value: string): string {
	return truncateText(value, META_VALUE_MAX_LENGTH);
}

// Match strength of a query against a search field: 0 when the query equals
// the whole field, otherwise 1 for a fuzzy match. Lower is stronger.
function getMatchTier(query: string, field: string): number {
	return query.toLowerCase() === field.trim().toLowerCase() ? 0 : 1;
}

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
	// Pre-fills the search input on open.
	initialValue?: string;
	getText: (item: T, ctx?: { activeGrouping: string | null }) => string;
	// Text the query is matched against; defaults to getText.
	getSearchText?: (item: T) => string;
	// Maximum length used to truncate the displayed title with an ellipsis.
	// Searching always uses the full text from getText/getSearchText*.
	titleMaxLength?: number;
	// Alternative to getSearchText: fields matched independently, so a query
	// must be satisfied within a single field rather than spanning across them.
	// The item matches when any field matches; the best score wins for ranking.
	getSearchTexts?: (item: T) => string[];
	// Optional muted second line rendered beneath the text.
	getSubtext?: (item: T) => string | null;
	// Optional cover image URL rendered as a thumbnail on the left of the row.
	// When absent the row renders without the image.
	getCover?: (item: T) => string | null;
	// Optional meta key/value pairs rendered beneath the title (labels may be
	// omitted for bare values). Takes precedence over getSubtext when it
	// returns one or more entries.
	getMeta?: (item: T) => ConductorSelectorMeta[] | null;
	// Optional single meta value rendered right-aligned on the title line
	// (e.g. a rating shown as stars), independent of getMeta.
	getTitleRightMeta?: (item: T) => string | null;
	// Optional trailing badges rendered at the end of the row (e.g. emojis).
	getBadges?: (item: T) => string[];
	// Deterministic ordering for grouped views (applied after filtering).
	sortItems?: (a: T, b: T) => number;
	// While searching, rank grouped results (and their group headers) by match
	// relevance — exact field matches first, then fuzzy score — instead of the
	// deterministic order. No query keeps the deterministic order. Off by default.
	rankGroupsByRelevance?: boolean;
	// The first grouping is the default (active on open). By convention the
	// caller orders the array accordingly.
	groupings?: ConductorSelectorGrouping<T>[];
	// Which grouping is active on open. When set, overrides the first-grouping
	// default; `null` opens on the flat list. When unset the first grouping is
	// used (existing behaviour).
	initialGroupingId?: string | null;
	// Multi-select mode: click or Cmd/Ctrl+Space toggles items, Enter confirms
	// the selection set. Only meaningful via showMulti().
	multiSelect?: boolean;
	// Multi-select only: when nothing is checked, Enter confirms an empty
	// selection instead of auto-selecting the highlighted/first item.
	allowEmptySelection?: boolean;
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
		this.activeGroupingId =
			options.initialGroupingId !== undefined
				? options.initialGroupingId
				: (options.groupings?.[0]?.id ?? null);
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
		if (this.options.initialValue) {
			this.inputEl.value = this.options.initialValue;
			this.inputEl.select();
			this.inputEl.dispatchEvent(new Event("input"));
		}
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
			if (!grouping) return;

			e.preventDefault();
			// Toggling the active grouping returns to the flat list.
			this.activeGroupingId =
				grouping.id === this.activeGroupingId
					? null
					: grouping.id;
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
		// Match relevance per item (lower tier is a stronger match), used to
		// rank grouped results while searching.
		const relevance = new Map<T, { tier: number; score: number }>();

		if (q.length > 0) {
			const search = prepareFuzzySearch(q);
			const getSingleText = this.options.getSearchText ?? this.options.getText;
			const getSearchTexts =
				this.options.getSearchTexts ??
				((item: T) => [getSingleText(item)]);
			items = items
				.map((item) => {
					let best: NonNullable<ReturnType<typeof search>> | null = null;
					let bestTier = 1;
					for (const field of getSearchTexts(item)) {
						if (!field.trim()) continue;
						const result = search(field);
						if (!result) continue;
						const tier = getMatchTier(q, field);
						if (
							!best ||
							tier < bestTier ||
							(tier === bestTier && result.score > best.score)
						) {
							best = result;
							bestTier = tier;
						}
					}
					if (best) {
						relevance.set(item, { tier: bestTier, score: best.score });
					}
					return { item, best };
				})
				.filter(
					(m): m is { item: T; best: NonNullable<ReturnType<typeof search>> } =>
						m.best !== null,
				)
				.sort((a, b) => b.best.score - a.best.score)
				.map((m) => m.item);
		}

		const grouping = this.getActiveGrouping();
		if (!grouping) {
			if (q.length === 0 && this.options.sortItems) {
				items.sort(this.options.sortItems);
			}
			return items.map((item) => ({ kind: "item" as const, item }));
		}

		const searching = q.length > 0;

		const relevanceOf = (item: T): { tier: number; score: number } =>
			relevance.get(item) ?? { tier: 1, score: 0 };

		const compareItemsByRelevance = (a: T, b: T): number => {
			const ra = relevanceOf(a);
			const rb = relevanceOf(b);
			if (ra.tier !== rb.tier) return ra.tier - rb.tier;
			if (ra.score !== rb.score) return rb.score - ra.score;
			return this.options.sortItems?.(a, b) ?? 0;
		};

		const groupBestRelevance = (
			groupItems: T[],
		): { tier: number; score: number } => {
			let best = { tier: 1, score: -Infinity };
			for (const item of groupItems) {
				const r = relevanceOf(item);
				if (r.tier < best.tier || (r.tier === best.tier && r.score > best.score)) {
					best = r;
				}
			}
			return best;
		};

		// Grouped views keep a deterministic order rather than fuzzy rank,
		// unless the picker opts into ranking by match relevance while
		// searching (rankGroupsByRelevance).
		if (searching && this.options.rankGroupsByRelevance) {
			items.sort(compareItemsByRelevance);
		} else if (this.options.sortItems) {
			items.sort(this.options.sortItems);
		}

		const groups = grouping.buildGroups(items);

		if (searching && this.options.rankGroupsByRelevance) {
			// Move the group containing the strongest match to the top; keep
			// the deterministic header order as a tiebreaker.
			const originalOrder = new Map(groups.map((g, i) => [g, i]));
			const rankedGroups = [...groups].sort((a, b) => {
				const aBest = groupBestRelevance(a.items);
				const bBest = groupBestRelevance(b.items);
				if (aBest.tier !== bBest.tier) return aBest.tier - bBest.tier;
				if (aBest.score !== bBest.score) return bBest.score - aBest.score;
				return (originalOrder.get(a) ?? 0) - (originalOrder.get(b) ?? 0);
			});
			groups.length = 0;
			groups.push(...rankedGroups);
		}

		const entries: ConductorSelectorEntry<T>[] = [];
		for (const group of groups) {
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

		const cover = this.options.getCover?.(item.item);
		if (cover) {
			const img = row.createEl("img", { cls: "conductor-suggest-cover" });
			img.src = cover;
			img.loading = "lazy";
		}

		// Title plus supporting lines live in a column next to the cover so
		// the whole row grows as one block.
		const body = row.createDiv({ cls: "conductor-suggest-body" });

		// Multi-select checkbox sits on the title line, right before the title,
		// rather than floating on the far left of the row.
		const titleRow = body.createDiv({ cls: "conductor-suggest-title-row" });
		if (this.multiSelect) {
			const isSelected = this.selectedItems.has(item.item);
			titleRow.createSpan({
				cls: "conductor-suggest-check",
				text: isSelected ? "☑" : "☐",
			});
			if (isSelected) el.addClass("conductor-suggest-selected");
		}
		const displayText = (item: T): string => {
			const text = this.options.getText(item, {
				activeGrouping: this.getActiveGrouping()?.id ?? null,
			});
			return this.options.titleMaxLength
				? truncateText(text, this.options.titleMaxLength)
				: text;
		};
		titleRow.createSpan({
			cls: "conductor-suggest-title",
			text: displayText(item.item),
		});

		const titleMeta = this.options.getTitleRightMeta?.(item.item);
		if (titleMeta) {
			titleRow.createSpan({
				cls: "conductor-suggest-title-meta",
				text: titleMeta,
			});
		}

		const meta = this.options.getMeta?.(item.item);
		if (meta && meta.length > 0) {
			const metaEl = body.createDiv({ cls: "conductor-suggest-meta" });
			for (const entry of meta) {
				if (entry.label) {
					metaEl.createSpan({
						cls: "conductor-suggest-meta-label",
						text: entry.label,
					});
				}
				metaEl.createSpan({
					cls: "conductor-suggest-meta-value",
					text: truncateMetaValue(entry.value),
				});
			}
		} else {
			const subtext = this.options.getSubtext?.(item.item);
			if (subtext) {
				body.createDiv({ text: subtext, cls: "conductor-suggest-subtext" });
			}
		}

		const badges = this.options.getBadges?.(item.item);
		if (badges && badges.length > 0) {
			row.createSpan({
				cls: "conductor-suggest-badges",
				text: badges.join(" "),
			});
		}
	}

	// Obsidian resolves Enter/clicks through selectSuggestion, which closes the
	// modal BEFORE invoking onChooseSuggestion. Intercept group headers here so
	// the selector stays open until an actual item is chosen.
	selectSuggestion(
		value: ConductorSelectorEntry<T>,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (
			value.kind === "header" &&
			!(this.multiSelect && !(evt instanceof MouseEvent))
		) {
			evt.preventDefault();
			return;
		}
		super.selectSuggestion(value, evt);
	}

	onChooseSuggestion(
		item: ConductorSelectorEntry<T>,
		evt: MouseEvent | KeyboardEvent,
	): void {
		if (item.kind === "header") {
			// Multi-select keyboard Enter on a header confirms the selection
			// set; single-select headers never reach here.
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
		if (chosen.length === 0 && !this.options.allowEmptySelection) {
			if (highlighted) {
				chosen.push(highlighted);
			} else {
				const first = this.firstRenderedItem();
				if (!first) return;
				chosen.push(first);
			}
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
