import { TFile, moment } from "obsidian";

import { addTag, fileHasTag, getNoteTitle } from "../utilities";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";
import { TriageView, TriageAction } from "./triage-view";

export const JOURNAL_TRIAGE_VIEW_TYPE = "conductor-journal-triage";

export class JournalTriageView extends TriageView {
	type = JOURNAL_TRIAGE_VIEW_TYPE;

	protected renderTitle(parentEl: HTMLElement, file: TFile): void {
		const title = getNoteTitle(this.app, file);
		const match = title.match(
			/^(\d{4})-(\d{2})-(\d{2})\s+\d{4}\s*-\s*(.*)$/,
		);
		const rest = match ? match[4].trim() : title;
		if (!rest) {
			super.renderTitle(parentEl, file);
			return;
		}

		const time = moment(file.stat.ctime).format("HH:mm");

		parentEl.createSpan({
			text: time,
			cls: "conductor-triage-title-time",
		});

		const linkEl = parentEl.createEl("a", {
			text: rest,
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
	}

	/**
	 * Every action is always rendered; actions that do not apply to a note are
	 * disabled instead of hidden so rows keep a consistent set of buttons.
	 */
	protected getActions(): TriageAction[] {
		return [
			{
				icon: "file-text",
				tooltip: "Open note",
				run: (target) =>
					void this.app.workspace.getLeaf(false).openFile(target),
			},
			{
				icon: "circle-check",
				tooltip: "Mark as reflected",
				disabled: (target) => fileHasTag(this.app, target, "reflected"),
				run: (target) => addTag(this.app, target, "reflected"),
			},
			{
				icon: "file-plus",
				tooltip: "Create task from note",
				disabled: (target) => !isNoteTaskCreatable(this.app, target),
				run: (target) => createTaskFromNote(this.app, target),
			},
		];
	}
}
