import { App, Notice, TFile } from "obsidian";
import { ConductorSelectorModal } from "src/conductor-selector-modal";
import { TextInputModal } from "src/text-input-modal";
import { Context } from "src/projects";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";

const CONTEXTS: Context[] = [Context.Personal, Context.Work];

// Work and personal epics are shaped differently: work epics list their
// meetings, personal epics list notes and tasks.
const getEpicTemplateName = (context: Context): string =>
	context === Context.Work ? "Epic - Work" : "Epic - Personal";

export const createEpic = async (app: App): Promise<void> => {
	const context = await ConductorSelectorModal.show(app, {
		items: CONTEXTS,
		placeholder: "Is this epic for Work or Personal?",
		getText: (item) => item,
	});
	if (!context) return;

	const { value: epicName, cancelled } = await TextInputModal.show(app, {
		title: "Epic Name",
		placeholder: `Enter a name for this ${context.toLowerCase()} epic...`,
	});
	if (cancelled) return;

	const name = sanitizeFileName(epicName);
	if (!name) {
		new Notice("An epic name is required.");
		return;
	}

	const templateName = getEpicTemplateName(context);
	const filePath = getUniqueEpicPath(app, context, name);

	let file: TFile | null;
	try {
		file = await createFileFromTemplate(app, filePath, templateName);
	} catch (error) {
		console.error(error);
		new Notice(`Failed to create epic [${name}]: ${error?.message ?? error}`);
		return;
	}
	if (!file) {
		new Notice(`Failed to create epic. Template '${templateName}' may be missing.`);
		return;
	}

	new Notice(`Epic [${name}] created.`);
	await app.workspace.getLeaf(false).openFile(file);
};

// Epics sit alongside projects in the context folder, named after the epic
// itself, so a clash is possible and gets a counter suffix.
function getUniqueEpicPath(app: App, context: Context, name: string): string {
	const directory = `Projects/${context}`;
	let path = `${directory}/${name}.md`;
	let counter = 2;

	while (app.vault.getFileByPath(path)) {
		path = `${directory}/${name} ${counter}.md`;
		counter += 1;
	}

	return path;
}
