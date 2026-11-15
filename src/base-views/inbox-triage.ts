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
import {
	convertNoteToTask,
	isNoteConvertible,
} from "../commands/convert-note-to-task";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";

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

	constructor(controller: QueryController, containerEl: HTMLElement) {
		super(controller);
		this.containerEl = containerEl.createDiv({
			cls: "conductor-inbox-triage",
		});
	}

	private getActions(file: TFile): InboxTriageAction[] {
		const actions: InboxTriageAction[] = [
			{
				icon: "tag",
				tooltip: "Remove #inbox tag",
				run: (target) => removeTag(this.app, target, "inbox"),
			},
		];

		if (isNoteConvertible(this.app, file)) {
			actions.push({
				icon: "circle-arrow-right",
				tooltip: "Convert note to task",
				run: (target) => convertNoteToTask(this.app, target),
			});
		}

		if (isNoteTaskCreatable(this.app, file)) {
			actions.push({
				icon: "file-plus",
				tooltip: "Create task from note",
				run: (target) => createTaskFromNote(this.app, target),
			});
		}

		actions.push({
			icon: "trash",
			tooltip: "Delete note",
			cls: "conductor-inbox-triage-action--delete",
			run: (target) => this.app.fileManager.trashFile(target),
		});

		return actions;
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
		const actions = this.getActions(file);
		for (const action of actions) {
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