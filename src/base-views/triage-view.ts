import {
	BasesEntry,
	BasesPropertyId,
	BasesView,
	IconName,
	QueryController,
	TFile,
	setIcon,
	setTooltip,
} from "obsidian";
import type { Value } from "obsidian";

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

		this.renderProperties(itemEl, entry);

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

	/**
	 * Render whichever properties the user picked in the view's properties
	 * toolbar menu, so the row reflects the Base's configuration rather than a
	 * hard-coded set of values. The note name is always shown as the title, so
	 * it is skipped here to avoid repeating it.
	 */
	private renderProperties(
		parentEl: HTMLElement,
		entry: BasesEntry,
	): void {
		const fieldsEl = parentEl.createDiv({
			cls: "conductor-triage-fields",
		});

		for (const propertyId of this.getVisiblePropertyIds()) {
			if (propertyId === "file.name") continue;

			const value = this.getPropertyValue(entry, propertyId);
			if (!value) continue;

			const fieldEl = fieldsEl.createDiv({
				cls: "conductor-triage-field",
			});
			fieldEl.createSpan({
				cls: "conductor-triage-field-label",
				text: this.config.getDisplayName(propertyId),
			});
			value.renderTo(
				fieldEl.createSpan({
					cls: "conductor-triage-field-value",
				}),
				this.app.renderContext,
			);
		}

		// Nothing to show: drop the container so it cannot affect the layout.
		if (fieldsEl.childElementCount === 0) {
			fieldsEl.remove();
		}
	}

	/**
	 * Properties the user has chosen to display, in their configured order.
	 * Falls back to the query result's visible properties for Bases versions
	 * where the view config does not carry an order.
	 */
	private getVisiblePropertyIds(): BasesPropertyId[] {
		const ordered = this.config.getOrder();
		return ordered.length > 0 ? ordered : this.data.properties;
	}

	private getPropertyValue(
		entry: BasesEntry,
		propertyId: BasesPropertyId,
	): Value | null {
		let value: Value | null;
		try {
			value = entry.getValue(propertyId);
		} catch {
			// A formula can fail to evaluate; treat it as having no value.
			return null;
		}

		if (!value || value.toString().trim().length === 0) {
			return null;
		}

		return value;
	}
}