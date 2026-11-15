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

	/**
	 * Every action is always rendered. Actions that do not apply to a note (a
	 * note that is already a task, for example) are disabled instead of hidden,
	 * so rows keep a consistent set of buttons.
	 */
	protected getActions(): TriageAction[] {
		return [
			{
				icon: "tag",
				tooltip: "Remove #inbox tag",
				run: (target) => removeTag(this.app, target, "inbox"),
			},
			{
				icon: "circle-arrow-right",
				tooltip: "Convert note to task",
				disabled: (target) => !isNoteConvertible(this.app, target),
				run: (target) => convertNoteToTask(this.app, target),
			},
			{
				icon: "file-plus",
				tooltip: "Create task from note",
				disabled: (target) => !isNoteTaskCreatable(this.app, target),
				run: (target) => createTaskFromNote(this.app, target),
			},
			{
				icon: "trash",
				tooltip: "Delete note",
				cls: "conductor-triage-action--delete",
				run: (target) => this.app.fileManager.trashFile(target),
			},
		];
	}
}
