import {
	App,
	Notice,
	TFile,
	parseFrontMatterStringArray,
} from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { DatePickerModal } from "src/date-picker-modal";
import { ZoneTimesModal } from "src/zone-times-modal";
import { ConfirmModal } from "src/confirm-modal";
import {
	createFileFromTemplate,
	getFilesWithCategory,
	sanitizeFileName,
} from "src/utilities";

// Shown as the VO2 Max prompt's placeholder when the vault has no recorded
// value yet.
const DEFAULT_VO2_MAX = 42;

function getRunTypes(app: App): TFile[] {
	return getFilesWithCategory(app, "Run Type").sort((a, b) => {
		if (a.basename === "Open Run") return -1;
		if (b.basename === "Open Run") return 1;
		return a.basename.localeCompare(b.basename);
	});
}

function getRunTypeFromFile(app: App, file: TFile): string | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.["run-type"];
	if (raw == null) return null;
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (typeof value !== "string") return null;
	const stripped = value.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
	return stripped || null;
}

function getLastKnownWeight(app: App): number | null {
	const weeklyNoteKey = (basename: string): number => {
		const match = basename.match(/^(\d{4})-W(\d{1,2})$/);
		return match
			? parseInt(match[1], 10) * 100 + parseInt(match[2], 10)
			: -1;
	};

	const weeklyNotes = app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith("_weekly notes/"))
		.sort((a, b) => weeklyNoteKey(b.basename) - weeklyNoteKey(a.basename));

	for (const note of weeklyNotes) {
		const weight = app.metadataCache.getFileCache(note)?.frontmatter?.[
			"ht-weight"
		];
		if (weight == null || weight === "") continue;
		const parsed = Number(weight);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return null;
}

function parseTimeToSeconds(time: string): number {
	const parts = time.split(":");
	const hours = parts.length > 2 ? parseInt(parts[0], 10) : 0;
	const minutes = parseInt(parts.length > 2 ? parts[1] : parts[0], 10);
	const seconds = parseInt(parts.length > 2 ? parts[2] : parts[1], 10);
	return hours * 3600 + minutes * 60 + seconds;
}

// Validator for TextInputModal.showValidated: accepts values matching `pattern`
// and reports `message` otherwise.
function requireMatch(
	pattern: RegExp,
	message: string,
): (value: string) => string | null {
	return (value) => (pattern.test(value) ? null : message);
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

function isRunNote(app: App, file: TFile): boolean {
	if (file.path.startsWith("_templates/")) return false;
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (!frontmatter) return false;
	const types = parseFrontMatterStringArray(frontmatter, "type") ?? [];
	return types.some(
		(type) =>
			type
				.replace(/^\[\[|\]\]$/g, "")
				.split("|")[0]
				.trim()
				.toLowerCase() === "run",
	);
}

function findRunNoteOnDate(app: App, date: string): TFile | null {
	return (
		app.vault.getMarkdownFiles().find(
			(file) => isRunNote(app, file) && dateOfEventDay(app, file) === date,
		) ?? null
	);
}

// js-yaml (and therefore Obsidian) parses an unquoted YAML date into a Date at
// UTC midnight. Extract the calendar day using UTC components: local components
// land on the previous day in negative-offset timezones.
function dateOfEventDay(app: App, file: TFile): string | null {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.[
		"date-of-event"
	];
	if (raw instanceof Date) return raw.toISOString().slice(0, 10);
	if (typeof raw !== "string") return null;
	const day = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
	if (day) return day;
	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

// Finite sentinel for notes with no usable date, so comparator subtraction stays
// numeric (Number.NEGATIVE_INFINITY minus itself is NaN).
const NO_DATE = Number.MIN_SAFE_INTEGER;

function runNoteTimestamp(app: App, file: TFile): number {
	const day = dateOfEventDay(app, file);
	if (!day) return NO_DATE;
	const parsed = Date.parse(`${day}T00:00:00Z`);
	return Number.isNaN(parsed) ? NO_DATE : parsed;
}

function getLastKnownVo2Max(app: App): number | null {
	const runs = app.vault
		.getMarkdownFiles()
		.filter((file) => isRunNote(app, file))
		.sort((a, b) => runNoteTimestamp(app, b) - runNoteTimestamp(app, a));

	for (const note of runs) {
		const frontmatter = app.metadataCache.getFileCache(note)?.frontmatter;
		const vo2Max = frontmatter?.["vo2-max"];
		if (vo2Max == null || vo2Max === "") continue;
		const parsed = Number(vo2Max);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return null;
}

export const addRun = async (app: App): Promise<void> => {
	const usedRunningPlan = await ConfirmModal.show(app, {
		title: "Running Plan",
		message: "Was a running plan used for this run?",
		confirmLabel: "Yes",
	});

	let runningPlan: string | null = null;
	let initialRunType: string | undefined;
	if (usedRunningPlan) {
		const runningPlanFile = await ConductorSelectorModal.show(app, {
			items: getFilesWithCategory(app, "Running Plan"),
			placeholder: "Select a running plan...",
			getText: (file) => file.basename,
		});
		if (!runningPlanFile) {
			new Notice("A running plan must be selected");
			return;
		}
		runningPlan = `[[${runningPlanFile.basename}]]`;
		const runTypeFromPlan = getRunTypeFromFile(app, runningPlanFile);
		if (runTypeFromPlan) initialRunType = runTypeFromPlan;
	}

	const runTypeFile = await ConductorSelectorModal.show(app, {
		items: getRunTypes(app),
		placeholder: "Select run type...",
		getText: (file) => file.basename,
		initialValue: initialRunType,
	});
	if (!runTypeFile) return;
	const runType = runTypeFile.basename;

	let targetPace: string | null = null;
	if (runType === "Goal Pace Run") {
		const targetPacePrompt = await TextInputModal.showValidated(
			app,
			{
				title: "Target Pace (/km)",
				placeholder: "5.30",
			},
			requireMatch(/^\d+(\.\d+)?$/, "Target pace must be entered (e.g. 5.30)"),
		);
		if (targetPacePrompt.cancelled) return;
		targetPace = targetPacePrompt.value;
	}

	const date = await DatePickerModal.show(app);
	if (!date) return;

	const existingRunNote = findRunNoteOnDate(app, date);
	if (existingRunNote) {
		let proceed = false;
		try {
			proceed = await ConfirmModal.show(app, {
				title: "Run note already exists",
				message: `A run note for ${date} already exists (${existingRunNote.basename}). Do you want to continue anyway?`,
			});
		} catch (error) {
			console.error("ConfirmModal failed", error);
			new Notice("ConfirmModal failed, see console");
		}
		if (!proceed) return;
	}

	const runningFormEffortPrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Running Form Effort (1-5)",
			placeholder: "3",
		},
		requireMatch(/^[1-5]$/, "Running form effort must be a number from 1 to 5"),
	);
	if (runningFormEffortPrompt.cancelled) return;
	const runningFormEffort = runningFormEffortPrompt.value;

	const workoutTimePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Workout Time",
			placeholder: "HH:MM:SS",
			description: "Time spent actually running.",
		},
		requireMatch(
			/^\d{1,2}:\d{2}:\d{2}$/,
			"Workout time must be in HH:MM:SS format",
		),
	);
	if (workoutTimePrompt.cancelled) return;
	const workoutTime = workoutTimePrompt.value;

	const elapsedTimePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Elapsed Time",
			placeholder: "HH:MM:SS (defaults to workout time)",
			description: "Time spent including pauses.",
		},
		requireMatch(
			/^(\d{1,2}:\d{2}:\d{2})?$/,
			"Elapsed time must be in HH:MM:SS format, or left empty",
		),
	);
	if (elapsedTimePrompt.cancelled) return;
	const elapsedTime = elapsedTimePrompt.value;

	const targetTimePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Target Time",
			placeholder: "HH:MM:SS (optional)",
			description: "Time spent achieving goal of run.",
		},
		requireMatch(
			/^(\d{1,2}:\d{2}:\d{2})?$/,
			"Target time must be in HH:MM:SS format, or left empty",
		),
	);
	if (targetTimePrompt.cancelled) return;
	const targetTime = targetTimePrompt.value;

	const distancePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Distance (km)",
			placeholder: "21.1",
		},
		requireMatch(/^\d+(\.\d+)?$/, "Distance must be a number (e.g. 21.1)"),
	);
	if (distancePrompt.cancelled) return;
	const distance = distancePrompt.value;

	const elevationGainPrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Elevation Gain (meters)",
			placeholder: "250 or -50",
		},
		requireMatch(
			/^-?\d+(\.\d+)?$/,
			"Elevation gain must be a number (e.g. 250 or -50)",
		),
	);
	if (elevationGainPrompt.cancelled) return;
	const elevationGain = elevationGainPrompt.value;

	const pacePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Average Pace (/km)",
			placeholder: "5.30",
		},
		requireMatch(/^\d+(\.\d+)?$/, "Average pace must be a number (e.g. 5.30)"),
	);
	if (pacePrompt.cancelled) return;
	const pace = pacePrompt.value;

	const heartRatePrompt = await TextInputModal.showValidated(
		app,
		{
			title: "Average Heart Rate",
			placeholder: "155",
		},
		requireMatch(/^\d+$/, "Heart rate must be a number"),
	);
	if (heartRatePrompt.cancelled) return;
	const heartRate = heartRatePrompt.value;

	// A blank entry means no time in that zone and is recorded as 0.
	const parseZoneTimes = (values: string[]): (number | null)[] =>
		values.map((value) => {
			const trimmed = value.trim();
			if (!trimmed || trimmed === "0") return 0;
			if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
				return null;
			}
			return parseTimeToSeconds(trimmed);
		});

	let zoneValues: string[] | undefined;
	let zoneError: string | undefined;
	let zoneTimesInSeconds: (number | null)[] = [];
	while (true) {
		const zoneTimes = await ZoneTimesModal.show(app, {
			values: zoneValues,
			error: zoneError,
		});
		if (zoneTimes.cancelled) return;

		zoneTimesInSeconds = parseZoneTimes(zoneTimes.values);
		const invalidZoneIndex = zoneTimesInSeconds.findIndex(
			(seconds) => seconds === null,
		);
		if (invalidZoneIndex === -1) break;

		zoneError = `Time In Zone ${invalidZoneIndex + 1} must be in MM:SS or HH:MM:SS format, or left empty`;
		zoneValues = zoneTimes.values;
	}
	const zoneSeconds = zoneTimesInSeconds.map((seconds) => seconds ?? 0);

	const lastKnownVo2Max = getLastKnownVo2Max(app);
	const vo2MaxPrompt = await TextInputModal.showValidated(
		app,
		{
			title: "VO2 Max",
			placeholder: String(lastKnownVo2Max ?? DEFAULT_VO2_MAX),
		},
		requireMatch(/^\d+(\.\d+)?$/, "VO2 Max must be a number (e.g. 49.2)"),
	);
	if (vo2MaxPrompt.cancelled) return;
	const vo2Max = vo2MaxPrompt.value;

	const fileName = `${date} - ${runType}.md`;
	const filePath = getUniqueFilePath(app, sanitizeFileName(fileName));

	const file = await createFileFromTemplate(app, filePath, "Run");
	if (!file) {
		new Notice("Failed to create run note. Is the 'Run' template available?");
		return;
	}

	const lastKnownWeight = getLastKnownWeight(app);

	const workoutSeconds = parseTimeToSeconds(workoutTime);
	const elapsedSeconds = elapsedTime
		? parseTimeToSeconds(elapsedTime)
		: workoutSeconds;
	const targetSeconds = targetTime ? parseTimeToSeconds(targetTime) : null;

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["run-type"] = `[[${runType}]]`;
		if (runningPlan !== null) {
			fm["running-plan"] = runningPlan;
		}
		if (targetPace !== null) {
			fm["target-pace"] = parseFloat(targetPace);
		}
		fm["date-of-event"] = date;
		fm["running-form-effort"] = parseInt(runningFormEffort, 10);
		fm["distance"] = parseFloat(distance);
		fm["elevation-gain"] = parseFloat(elevationGain);
		fm["workout-time-in-seconds"] = workoutSeconds;
		fm["elapsed-time-in-seconds"] = elapsedSeconds;
		if (targetSeconds !== null) {
			fm["target-time-in-seconds"] = targetSeconds;
		}
		fm["average-pace"] = parseFloat(pace);
		fm["average-heart-rate"] = parseInt(heartRate, 10);
		if (lastKnownWeight !== null) {
			fm["last-known-weight"] = lastKnownWeight;
		}
		for (let i = 0; i < zoneSeconds.length; i++) {
			fm[`time-in-zone-${i + 1}-in-seconds`] = zoneSeconds[i];
		}
		fm["vo2-max"] = parseFloat(vo2Max);
	});

	await app.workspace.getLeaf(false).openFile(file);
	new Notice(`Created run note: ${file.basename}`);
};
