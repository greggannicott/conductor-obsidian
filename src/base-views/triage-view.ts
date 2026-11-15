import {
	BasesEntry,
	BasesView,
	IconName,
	QueryController,
	TFile,
	setIcon,
	setTooltip,
} from "obsidian";

import { getNoteTitle } from "../utilities";

export interface TriageAction {
	icon: IconName;
	tooltip: string;
	cls?: string;
	disabled?: (file: TFile) => boolean;
	run: (file: TFile) => void | Promise<void>;
}

export abstract class TriageView extends BasesView {
	abstract type: string;
	protected containerEl: HTMLElement;

	constructor(controller: QueryController, containerEl: HTMLElement) {
		super(controller);
		this.containerEl = containerEl.createDiv({ cls: "conductor-triage" });
	}

	onDataUpdated(): void {
		this.render();
	}

	protected abstract getActions(file: TFile): TriageAction[];

	private render(): void {
		this.containerEl.empty();

		let hasEntries = false;
		for (const group of this.data.groupedData) {
			if (group.entries.length === 0) continue;
			hasEntries = true;

			const groupEl = this.containerEl.createDiv({
				cls: "conductor-triage-group",
			});
			if (group.hasKey()) {
				const headerEl = groupEl.createDiv({
					cls: "conductor-triage-group-header",
				});
				group.key?.renderTo(headerEl, this.app.renderContext);
			}

			for (const entry of group.entries) {
				this.renderEntry(groupEl, entry);
			}
		}

		if (!hasEntries) {
			this.containerEl.createDiv({
				cls: "conductor-triage-empty",
				text: "No notes",
			});
		}
	}

	private renderEntry(
		parentEl: HTMLElement,
		entry: BasesEntry,
	): void {
		const file = entry.file;

		const itemEl = parentEl.createDiv({
			cls: "conductor-triage-item",
		});

		const linkEl = itemEl.createEl("a", {
			text: getNoteTitle(this.app, file),
			cls: "conductor-triage-title internal-link",
			href: file.path,
		});
		linkEl.addEventListener("click", (evt) => {
			evt.preventDefault();
			void this.app.workspace.openLinkText(
				file.path,
				"",
				evt.ctrlKey || evt.metaKey,
			);
		});

		const actionsEl = itemEl.createDiv({
			cls: "conductor-triage-actions",
		});
		const actions = this.getActions(file);
		for (const action of actions) {
			const buttonEl = actionsEl.createEl("button", {
				cls: [
					"clickable-icon",
					"conductor-triage-action",
					action.cls,
				]
					.filter(Boolean)
					.join(" "),
			});
			setIcon(buttonEl, action.icon);
			setTooltip(buttonEl, action.tooltip);
			buttonEl.setAttribute("aria-label", action.tooltip);
			buttonEl.disabled = action.disabled?.(file) ?? false;
			buttonEl.addEventListener("click", (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				void action.run(file);
			});
		}
	}
}