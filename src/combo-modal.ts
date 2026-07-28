import { App, Modal } from "obsidian";

export type ComboModalConfig = {
	title: string;
	placeholder: string;
	items: string[];
};

export class ComboModal extends Modal {
	private config: ComboModalConfig;
	private resolve: ((value: string | null) => void) | null = null;
	private inputEl: HTMLInputElement | null = null;
	private listEl: HTMLElement | null = null;
	private originalQuery: string = "";
	private selectedIndex: number = -1;
	private filteredItems: string[] = [];
	private allowClose: boolean = false;

	constructor(app: App, config: ComboModalConfig) {
		super(app);
		this.config = config;
		this.filteredItems = [...config.items];
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("conductor-combo-modal");

		this.inputEl = contentEl.createEl("input", {
			cls: ["conductor-combo-input", "input"],
			attr: { type: "text" },
		});
		this.inputEl.placeholder = this.config.placeholder;

		this.listEl = contentEl.createEl("ul", {
			cls: "conductor-combo-list",
		});

		const instructions = contentEl.createEl("div", {
			cls: "prompt-instructions",
		});
		const navInstruction = instructions.createEl("div", {
			cls: "prompt-instruction",
		});
		navInstruction.createEl("span", {
			cls: "prompt-instruction-command",
			text: "↑↓",
		});
		navInstruction.createEl("span", { text: "navigate" });

		const submitInstruction = instructions.createEl("div", {
			cls: "prompt-instruction",
		});
		submitInstruction.createEl("span", {
			cls: "prompt-instruction-command",
			text: "↵",
		});
		submitInstruction.createEl("span", { text: "submit" });

		this.inputEl.addEventListener("input", () => {
			this.originalQuery = this.inputEl!.value;
			this.selectedIndex = -1;
			this.filteredItems = this.filterItems(this.originalQuery);
			this.renderSuggestions();
		});

		this.inputEl.addEventListener("keydown", (e) => {
			if (e.isComposing) return;

			const isDown =
				e.key === "ArrowDown" || (e.ctrlKey && e.key === "n");
			const isUp = e.key === "ArrowUp" || (e.ctrlKey && e.key === "p");

			if (isDown) {
				e.preventDefault();
				this.selectedIndex = Math.min(
					this.selectedIndex + 1,
					this.filteredItems.length - 1,
				);
				this.inputEl!.value = this.filteredItems[this.selectedIndex];
				this.renderSuggestions();
			} else if (isUp) {
				e.preventDefault();
				if (this.selectedIndex > 0) {
					this.selectedIndex--;
					this.inputEl!.value =
						this.filteredItems[this.selectedIndex];
				} else if (this.selectedIndex === 0) {
					this.selectedIndex = -1;
					this.inputEl!.value = this.originalQuery;
				}
				this.renderSuggestions();
			} else
				switch (e.key) {
					case "Enter":
						e.preventDefault();
						if (this.inputEl!.value.trim().length === 0) return;
						this.resolve?.(this.inputEl!.value);
						this.allowClose = true;
						this.close();
						break;

					case "Escape":
						e.preventDefault();
						e.stopPropagation();
						if (this.inputEl!.value.length > 0) {
							this.inputEl!.value = "";
							this.originalQuery = "";
							this.selectedIndex = -1;
							this.filteredItems = [...this.config.items];
							this.renderSuggestions();
						} else {
							this.allowClose = true;
							this.close();
						}
						break;
				}
		});

		this.renderSuggestions();
		this.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	close(): void {
		if (!this.allowClose) return;
		super.close();
	}

	private filterItems(query: string): string[] {
		const q = query.trim().toLowerCase();
		if (q.length === 0) return [...this.config.items];
		return this.config.items.filter((item) =>
			item.toLowerCase().includes(q),
		);
	}

	private renderSuggestions(): void {
		if (!this.listEl) return;
		this.listEl.empty();

		for (let i = 0; i < this.filteredItems.length; i++) {
			const li = this.listEl.createEl("li", {
				cls: "conductor-combo-item",
			});
			li.createSpan({ text: this.filteredItems[i] });

			if (i === this.selectedIndex) {
				li.addClass("is-selected");
			}

			li.addEventListener("click", () => {
				if (this.inputEl) {
					this.inputEl.value = this.filteredItems[i];
					this.resolve?.(this.filteredItems[i]);
					this.allowClose = true;
					this.close();
				}
			});

			li.addEventListener("mouseenter", () => {
				if (this.inputEl && this.selectedIndex !== i) {
					this.selectedIndex = i;
					this.inputEl.value = this.filteredItems[i];
					this.renderSuggestions();
				}
			});
		}
	}

	static show(app: App, config: ComboModalConfig): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new ComboModal(app, config);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
