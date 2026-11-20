import { App } from "obsidian";

import {
	convertNoteToTask,
	isNoteConvertible,
} from "../commands/convert-note-to-task";
import {
	createTaskFromNote,
	isNoteTaskCreatable,
} from "../commands/create-task-from-note";
import { removeTag } from "../utilities";
import type { TriageAction } from "./triage-view";

/**
 * The actions behind the Inbox Triage buttons. The file context menu reuses
 * these so its items always match the buttons in the view.
 */
export function getInboxTriageActions(app: App): TriageAction[] {
	return [
		{
			icon: "tag",
			tooltip: "Remove #inbox tag",
			menuTitle: "Remove #inbox Tag",
			run: (target) => removeTag(app, target, "inbox"),
		},
		{
			icon: "circle-arrow-right",
			tooltip: "Convert note to task",
			menuTitle: "Convert to Task",
			disabled: (target) => !isNoteConvertible(app, target),
			run: (target) => convertNoteToTask(app, target),
		},
		{
			icon: "file-plus",
			tooltip: "Create task from note",
			menuTitle: "Create Task from Note",
			disabled: (target) => !isNoteTaskCreatable(app, target),
			run: (target) => createTaskFromNote(app, target),
		},
		{
			icon: "trash",
			tooltip: "Delete note",
			menuTitle: "Delete Note",
			cls: "conductor-triage-action--delete",
			warning: true,
			run: (target) => app.fileManager.trashFile(target),
		},
	];
}
