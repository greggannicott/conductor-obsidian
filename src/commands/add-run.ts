import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { DatePickerModal } from "src/date-picker-modal";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";

const RUN_TYPES = [
	"Open Run",
	"Interval Run",
	"Pyramid Interval Run",
	"Progression Run",
	"Time Trial Run",
	"Threshold Run",
	"Park Run",
] as const;

type RunType = (typeof RUN_TYPES)[number];

function parseTimeToSeconds(time: string): number {
	const parts = time.split(":");
	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	const seconds = parseInt(parts[2], 10);
	return hours * 3600 + minutes * 60 + seconds;
}

function getUniqueFilePath(app: App, basePath: string): string {
	let filePath = basePath;
	let counter = 2;
	while (app.vault.getFileByPath(filePath)) {
		filePath = basePath.replace(/\.md$/, ` (${counter}).md`);
		counter++;
	}
	return filePath;
}

export const addRun = async (app: App): Promise<void> => {
	const runType = await ConductorSelectorModal.show(app, {
		items: [...RUN_TYPES],
		placeholder: "Select run type...",
		getText: (type) => type,
	});
	if (!runType) return;

	const date = await DatePickerModal.show(app);
	if (!date) return;

	const distancePrompt = await TextInputModal.show(app, {
		title: "Distance (km)",
		placeholder: "21.1",
	});
	if (distancePrompt.cancelled) return;
	const distance = distancePrompt.value.trim();
	if (!distance || !/^\d+(\.\d+)?$/.test(distance)) {
		new Notice("Distance must be a number (e.g. 21.1)");
		return;
	}

	const workoutTimePrompt = await TextInputModal.show(app, {
		title: "Workout Time",
		placeholder: "HH:MM:SS",
	});
	if (workoutTimePrompt.cancelled) return;
	const workoutTime = workoutTimePrompt.value.trim();
	if (!/^\d{1,2}:\d{2}:\d{2}$/.test(workoutTime)) {
		new Notice("Workout time must be in HH:MM:SS format");
		return;
	}

	const elapsedTimePrompt = await TextInputModal.show(app, {
		title: "Elapsed Time",
		placeholder: "HH:MM:SS (defaults to workout time)",
	});
	if (elapsedTimePrompt.cancelled) return;
	const elapsedTime = elapsedTimePrompt.value.trim();
	if (elapsedTime && !/^\d{1,2}:\d{2}:\d{2}$/.test(elapsedTime)) {
		new Notice("Elapsed time must be in HH:MM:SS format");
		return;
	}

	const pacePrompt = await TextInputModal.show(app, {
		title: "Average Pace (/km)",
		placeholder: "5.30",
	});
	if (pacePrompt.cancelled) return;
	const pace = pacePrompt.value.trim();
	if (!pace || !/^\d+(\.\d+)?$/.test(pace)) {
		new Notice("Average pace must be a number (e.g. 5.30)");
		return;
	}

	const heartRatePrompt = await TextInputModal.show(app, {
		title: "Average Heart Rate",
		placeholder: "155",
	});
	if (heartRatePrompt.cancelled) return;
	const heartRate = heartRatePrompt.value.trim();
	if (!heartRate || !/^\d+$/.test(heartRate)) {
		new Notice("Heart rate must be a number");
		return;
	}

	const fileName = `${date} - ${runType}.md`;
	const filePath = getUniqueFilePath(app, sanitizeFileName(fileName));

	const file = await createFileFromTemplate(app, filePath, "Run");
	if (!file) {
		new Notice("Failed to create run note. Is the 'Run' template available?");
		return;
	}

	const workoutSeconds = parseTimeToSeconds(workoutTime);
	const elapsedSeconds = elapsedTime
		? parseTimeToSeconds(elapsedTime)
		: workoutSeconds;

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["run-type"] = `[[${runType}]]`;
		fm["date-of-event"] = date;
		fm["distance"] = parseFloat(distance);
		fm["workout-time-in-seconds"] = workoutSeconds;
		fm["elapsed-time-in-seconds"] = elapsedSeconds;
		fm["average-pace"] = parseFloat(pace);
		fm["average-heart-rate"] = parseInt(heartRate, 10);
	});

	await app.workspace.getLeaf(false).openFile(file);
	new Notice(`Created run note: ${file.basename}`);
};
