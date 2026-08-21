import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export type MeetingType = "General" | "Epic" | "Project";

type onChooseCallback = (meetingType: MeetingType) => void;

const MEETING_TYPES: MeetingType[] = ["General", "Epic", "Project"];

export class ChooseMeetingTypeModal {
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<MeetingType>(this.app, {
			items: MEETING_TYPES,
			placeholder: "Select a meeting type...",
			getText: (meetingType) => meetingType,
			onSelect: (meetingType) => this.onChoose(meetingType),
		}).open();
	}
}
