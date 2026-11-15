import { TFile } from "obsidian";

import { addTag, fileHasTag } from "../utilities";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";
import { TriageView, TriageAction } from "./triage-view";

export const JOURNAL_TRIAGE_VIEW_TYPE = "conductor-journal-triage";

export class JournalTriageView extends TriageView {
	type = JOURNAL_TRIAGE_VIEW_TYPE;

	protected getActions(file: TFile): TriageAction[] {
		const actions: TriageAction[] = [
			{
				icon: "circle-check",
				tooltip: "Mark as reflected",
				disabled: (target) => fileHasTag(this.app, target, "reflected"),
				run: (target) => addTag(this.app, target, "reflected"),
			},
		];

		if (isNoteTaskCreatable(this.app, file)) {
			actions.push({
				icon: "file-plus",
				tooltip: "Create task from note",
				run: (target) => createTaskFromNote(this.app, target),
			});
		}

		return actions;
	}
}