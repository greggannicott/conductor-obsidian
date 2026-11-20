import { App, Notice, TFile, moment, normalizePath } from "obsidian";

import { substituteTemplateBody } from "src/template-vars";

interface DailyNotesSettings {
	folder?: string;
	format?: string;
	template?: string;
}

interface CoreDailyNotesPlugin {
	enabled?: boolean;
	instance?: {
		options?: DailyNotesSettings;
	};
}

interface PeriodicNotesPlugin {
	settings?: {
		daily?: DailyNotesSettings & { enabled?: boolean };
	};
}

function validateSetting(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function getDailyNoteSettings(app: App): DailyNotesSettings | null {
	const periodicNotes = (app as any).plugins?.getPlugin?.(
		"periodic-notes",
	) as PeriodicNotesPlugin | null;
	const periodicDaily = periodicNotes?.settings?.daily;
	if (periodicDaily?.enabled) {
		return {
			folder: validateSetting(periodicDaily.folder),
			format: validateSetting(periodicDaily.format) || "YYYY-MM-DD",
			template: validateSetting(periodicDaily.template),
		};
	}

	const coreDailyNotes = (app as any).internalPlugins?.getPluginById?.(
		"daily-notes",
	) as CoreDailyNotesPlugin | null;
	const options = coreDailyNotes?.instance?.options;
	if (!options && !coreDailyNotes?.enabled) {
		return null;
	}

	return {
		folder: validateSetting(options?.folder),
		format: validateSetting(options?.format) || "YYYY-MM-DD",
		template: validateSetting(options?.template),
	};
}

async function ensureParentFolders(app: App, path: string): Promise<void> {
	const segments = path.split("/");
	segments.pop(); // remove filename
	let current = "";
	for (const segment of segments) {
		if (!segment) continue;
		current = current ? `${current}/${segment}` : segment;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

function resolveTemplateFile(app: App, template: string): TFile | null {
	if (!template) return null;
	const path = template.endsWith(".md") ? template : `${template}.md`;
	const file = app.vault.getFileByPath(path);
	if (file) return file;
	try {
		return (app.metadataCache.getFirstLinkpathDest(template, "") as TFile) ?? null;
	} catch {
		return null;
	}
}

export const openTomorrowsDailyNote = async (app: App): Promise<void> => {
	const settings = getDailyNoteSettings(app);
	if (!settings) {
		new Notice("Daily notes are not configured");
		return;
	}

	const tomorrow = moment().add(1, "day");
	const filename = tomorrow.format(settings.format);
	const notePath = normalizePath(
		settings.folder ? `${settings.folder}/${filename}.md` : `${filename}.md`,
	);

	const existing = app.vault.getFileByPath(notePath);
	if (existing) {
		await app.workspace.getLeaf(false).openFile(existing);
		return;
	}

	let content = "";
	if (settings.template) {
		const templateFile = resolveTemplateFile(app, settings.template);
		if (!templateFile) {
			new Notice("Daily note template not found");
			return;
		}
		const templateContent = await app.vault.read(templateFile);
		content = substituteTemplateBody(
			templateContent,
			{ title: filename },
			tomorrow,
			{ dateFormat: settings.format },
		);
	}

	try {
		await ensureParentFolders(app, notePath);
		const created = await app.vault.create(notePath, content);
		await app.workspace.getLeaf(false).openFile(created);
	} catch (err) {
		const raced = app.vault.getFileByPath(notePath);
		if (raced) {
			await app.workspace.getLeaf(false).openFile(raced);
			return;
		}
		console.error("Failed to create tomorrow's daily note", err);
		new Notice("Unable to create tomorrow's daily note");
	}
};