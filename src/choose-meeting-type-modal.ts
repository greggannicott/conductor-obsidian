import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export type MeetingType = "General" | "Epic" | "Project";

const MEETING_TYPES: MeetingType[] = ["General", "Epic", "Project"];

export function showMeetingTypeSelector(app: App): Promise<MeetingType | null> {
	return ConductorSelectorModal.show<MeetingType>(app, {
		items: MEETING_TYPES,
		placeholder: "Select a meeting type...",
		getText: (meetingType) => meetingType,
	});
}
