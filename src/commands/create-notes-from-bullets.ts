import { App, Notice, TFolder, TFile } from "obsidian";
import { ChooseTemplateModal } from "src/choose-template-modal";
import { createFileFromTemplate, addTag, vaultFileExists } from "src/utilities";
import {
	getActiveEditorOrNotify,
	getSelectedEditorContent,
	replaceLinesInEditor,
	LineReplacement,
} from "src/editor-utils";

interface BulletLine {
	lineIndex: number;
	indent: string;
	text: string;
}

const bulletPattern = /^(\s*)[-*] (.+)$/;
const linkPattern = /\[\[.+\]\]/;

export const createNewNotesFromBullets = async (app: App): Promise<void> => {
	const editor = getActiveEditorOrNotify(app);
	if (!editor) return;

	const selectedEditorContent = getSelectedEditorContent(editor);
	const bulletLines = collectBulletLines(selectedEditorContent.lines);
	if (!hasBulletLinesOrNotify(bulletLines)) return;

	const templateName = await promptForTemplateSelection(app);
	if (!templateName) return;

	const { createdCount, replacements } = await createNotesAndReplacements(
		app,
		bulletLines,
		templateName,
	);
	replaceLinesInEditor(editor, selectedEditorContent, replacements);
	showNoteCreationNotice(createdCount, templateName);
};

const collectBulletLines = (lines: string[]): BulletLine[] => {
	const bulletLines: BulletLine[] = [];
	lines.forEach((line, index) => {
		addBulletLineIfPresent(bulletLines, line, index);
	});
	return bulletLines;
};

const addBulletLineIfPresent = (
	bulletLines: BulletLine[],
	line: string,
	index: number,
) => {
	const match = line.match(bulletPattern);
	if (!match) return;

	const bulletText = match[2];
	if (linkPattern.test(bulletText)) return;

	bulletLines.push({
		lineIndex: index,
		indent: match[1],
		text: bulletText.trim(),
	});
};

const hasBulletLinesOrNotify = (bulletLines: BulletLine[]): boolean => {
	if (bulletLines.length > 0) return true;

	new Notice("No unconverted bullets found");
	return false;
};

const getTemplateNames = (app: App): string[] => {
	const templatesFolder = app.vault.getAbstractFileByPath("_templates");
	if (!templatesFolder || !(templatesFolder instanceof TFolder)) {
		new Notice("No templates folder found at _templates/");
		return [];
	}

	return templatesFolder.children
		.filter((child): child is TFile => child instanceof TFile && child.extension === "md")
		.map((file) => file.basename);
};

const promptForTemplateSelection = (app: App): Promise<string | null> => {
	const templateNames = getTemplateNames(app);
	if (templateNames.length === 0) {
		new Notice("No templates found in _templates/");
		return Promise.resolve(null);
	}

	return new Promise<string | null>((resolve) => {
		const modal = new ChooseTemplateModal(app);
		modal.templates = templateNames;
		modal.onChoose = (templateName: string) => {
			resolve(templateName);
		};
		modal.open();
	});
};

const createNotesAndReplacements = async (
	app: App,
	bulletLines: BulletLine[],
	templateName: string,
): Promise<{ createdCount: number; replacements: LineReplacement[] }> => {
	let createdCount = 0;
	const replacements: LineReplacement[] = [];

	for (const bulletLine of bulletLines) {
		const noteName = await createNoteForBullet(
			app,
			bulletLine,
			templateName,
		);
		if (!noteName) continue;

		createdCount++;
		replacements.push(buildLineReplacement(bulletLine, noteName));
	}

	return { createdCount, replacements };
};

const createNoteForBullet = async (
	app: App,
	bulletLine: BulletLine,
	templateName: string,
): Promise<string | null> => {
	const sanitizedName = bulletLine.text.replace(/[:\\/]/g, "");
	const uniqueName = getUniqueNoteFileName(app, sanitizedName);
	const filePath = `${uniqueName}.md`;

	const file = await createFileFromTemplate(app, filePath, templateName);
	if (!file) {
		new Notice(`Failed to create note from template "${templateName}"`);
		return null;
	}

	await addTag(app, file, "inbox");
	return uniqueName;
};

const getUniqueNoteFileName = (app: App, sanitizedName: string): string => {
	if (!vaultFileExists(app, `${sanitizedName}.md`)) {
		return sanitizedName;
	}

	let postfix = 0;
	let proposedName = "";
	let taken = true;
	while (taken) {
		postfix++;
		proposedName = `${sanitizedName} - ${postfix}`;
		if (!vaultFileExists(app, `${proposedName}.md`)) {
			taken = false;
		}
	}
	return proposedName;
};

const buildLineReplacement = (
	bulletLine: BulletLine,
	noteName: string,
): LineReplacement => {
	return {
		lineIndex: bulletLine.lineIndex,
		newLine: `${bulletLine.indent}- [[${noteName}]]`,
	};
};

const showNoteCreationNotice = (
	createdCount: number,
	templateName: string,
) => {
	new Notice(
		`Created ${createdCount} note${createdCount !== 1 ? "s" : ""} using "${templateName}" template`,
	);
};
