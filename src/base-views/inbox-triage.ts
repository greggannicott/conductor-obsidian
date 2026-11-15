import {
	BasesEntry,
	BasesView,
	IconName,
	QueryController,
	TFile,
	setIcon,
	setTooltip,
} from "obsidian";

import { getNoteTitle, removeTag } from "../utilities";

export const INBOX_TRIAGE_VIEW_TYPE = "conductor-inbox-triage";

interface InboxTriageAction {
	icon: IconName;
	tooltip: string;
	cls?: string;
	run: (file: TFile) => void | Promise<void>;
}

export class InboxTriageView extends BasesView {
	type = INBOX_TRIAGE_VIEW_TYPE;
	private containerEl: HTMLElement;
	private actions: InboxTriageAction[];

	constructor(controller: QueryController, containerEl: HTMLElement) {
		super(controller);
		this.containerEl = containerEl.createDiv({
			cls: "conductor-inbox-triage",
		});
		this.actions = [
			{
				icon: "tag",
				tooltip: "Remove #inbox tag",
				run: (file) => removeTag(this.app, file, "inbox"),
			},
			{
				icon: "trash",
				tooltip: "Delete note",
				cls: "conductor-inbox-triage-action--delete",
				run: (file) => this.app.fileManager.trashFile(file),
			},
		];
	}

	onDataUpdated(): void {
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		let hasEntries = false;
		for (const group of this.data.groupedData) {
			if (group.entries.length === 0) continue;
			hasEntries = true;

			const groupEl = this.containerEl.createDiv({
				cls: "conductor-inbox-triage-group",
			});
			if (group.hasKey()) {
				const headerEl = groupEl.createDiv({
					cls: "conductor-inbox-triage-group-header",
				});
				group.key?.renderTo(headerEl, this.app.renderContext);
			}

			for (const entry of group.entries) {
				this.renderEntry(groupEl, entry);
			}
		}

		if (!hasEntries) {
			this.containerEl.createDiv({
				cls: "conductor-inbox-triage-empty",
				text: "No inbox notes",
			});
		}
	}

	private renderEntry(
		parentEl: HTMLElement,
		entry: BasesEntry,
	): void {
		const file = entry.file;

		const itemEl = parentEl.createDiv({
			cls: "conductor-inbox-triage-item",
		});

		const linkEl = itemEl.createEl("a", {
			text: getNoteTitle(this.app, file),
			cls: "conductor-inbox-triage-title internal-link",
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
			cls: "conductor-inbox-triage-actions",
		});
		for (const action of this.actions) {
			const buttonEl = actionsEl.createEl("button", {
				cls: [
					"clickable-icon",
					"conductor-inbox-triage-action",
					action.cls,
				]
					.filter(Boolean)
					.join(" "),
			});
			setIcon(buttonEl, action.icon);
			setTooltip(buttonEl, action.tooltip);
			buttonEl.setAttribute("aria-label", action.tooltip);
			buttonEl.addEventListener("click", (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				void action.run(file);
			});
		}
	}
}