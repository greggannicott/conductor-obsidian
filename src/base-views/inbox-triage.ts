import { TFile } from "obsidian";

import { removeTag } from "../utilities";
import {
	convertNoteToTask,
	isNoteConvertible,
} from "../commands/convert-note-to-task";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";
import { TriageView, TriageAction } from "./triage-view";

export const INBOX_TRIAGE_VIEW_TYPE = "conductor-inbox-triage";

export class InboxTriageView extends TriageView {
	type = INBOX_TRIAGE_VIEW_TYPE;

	protected getActions(file: TFile): TriageAction[] {
		const actions: TriageAction[] = [
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
			cls: "conductor-triage-action--delete",
			run: (target) => this.app.fileManager.trashFile(target),
		});

		return actions;
	}
}