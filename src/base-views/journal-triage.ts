import { addTag, fileHasTag } from "../utilities";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";
import { TriageView, TriageAction } from "./triage-view";

export const JOURNAL_TRIAGE_VIEW_TYPE = "conductor-journal-triage";

export class JournalTriageView extends TriageView {
	type = JOURNAL_TRIAGE_VIEW_TYPE;

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
