import { getInboxTriageActions } from "./inbox-triage-actions";
import { TriageView, TriageAction } from "./triage-view";

export const INBOX_TRIAGE_VIEW_TYPE = "conductor-inbox-triage";

export class InboxTriageView extends TriageView {
	type = INBOX_TRIAGE_VIEW_TYPE;

	/**
	 * Every action is always rendered. Actions that do not apply to a note (a
	 * note that is already a task, for example) are disabled instead of hidden,
	 * so rows keep a consistent set of buttons. The same actions are used by
	 * the "Triage" submenu on the file context menu.
	 */
	protected getActions(): TriageAction[] {
		return getInboxTriageActions(this.app);
	}
}
