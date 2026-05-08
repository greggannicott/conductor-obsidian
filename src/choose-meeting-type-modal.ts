import { App, FuzzySuggestModal } from "obsidian";

export type MeetingType = "General" | "Epic" | "Project";

type onChooseCallback = (meetingType: MeetingType) => void;

export class ChooseMeetingTypeModal extends FuzzySuggestModal<MeetingType> {
	public onChoose: onChooseCallback;
	private meetingTypes: MeetingType[] = ["General", "Epic", "Project"];

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a meeting type...");
	}

	getItems(): MeetingType[] {
		return this.meetingTypes;
	}

	getItemText(meetingType: MeetingType): string {
		return meetingType;
	}

	onChooseItem(meetingType: MeetingType, _evt: MouseEvent | KeyboardEvent) {
		this.onChoose(meetingType);
	}
}
