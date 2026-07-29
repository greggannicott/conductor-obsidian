import { App, Notice } from "obsidian";
import {
	ChooseMeetingTypeModal,
	MeetingType,
} from "src/choose-meeting-type-modal";
import { TextInputModal } from "src/text-input-modal";
import { createFileFromTemplate } from "src/utilities";

export const createMeeting = async (app: App): Promise<void> => {
	const meetingType = await new Promise<MeetingType | null>((resolve) => {
		const modal = new ChooseMeetingTypeModal(app);
		modal.onChoose = (type: MeetingType) => resolve(type);
		modal.open();
	});

	if (!meetingType) return;

	const { value: meetingName } = await TextInputModal.show(app, {
		title: "Name of Meeting",
		placeholder: "Enter meeting name...",
	});

	const trimmedMeetingName = meetingName.trim();
	if (!trimmedMeetingName) {
		new Notice("Meeting name cannot be blank");
		return;
	}

	const sanitizedMeetingName = trimmedMeetingName
		.replace(/[:\\/]/g, "")
		.trim();
	if (!sanitizedMeetingName) {
		new Notice("Meeting name cannot be blank");
		return;
	}

	const templateName = getMeetingTemplateName(meetingType);
	const fileName = getUniqueMeetingFileName(app, sanitizedMeetingName);
	const filePath = `Projects/Work/${fileName}.md`;

	const file = await createFileFromTemplate(app, filePath, templateName);
	if (!file) {
		new Notice(
			"Failed to create meeting note. Template may be missing.",
		);
		return;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["date-of-event"] = "";
	});

	app.workspace.getLeaf(false).openFile(file);
};

function getMeetingTemplateName(meetingType: MeetingType): string {
	switch (meetingType) {
		case "General":
			return "Meeting";
		case "Epic":
			return "Meeting - Epic";
		case "Project":
			return "Meeting - Project";
		default:
			return "Meeting";
	}
}

function getUniqueMeetingFileName(app: App, meetingName: string): string {
	const sanitizedName = meetingName;
	const basePath = `Projects/Work/${sanitizedName}.md`;
	if (!app.vault.getFileByPath(basePath)) {
		return sanitizedName;
	}

	let counter = 2;
	while (true) {
		const proposedName = `${sanitizedName} (${counter})`;
		const proposedPath = `Projects/Work/${proposedName}.md`;
		if (!app.vault.getFileByPath(proposedPath)) {
			return proposedName;
		}
		counter++;
	}
}
