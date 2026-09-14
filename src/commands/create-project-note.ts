import { App, Editor, Notice, TFile } from "obsidian";
import { showProjectSelector } from "src/choose-project-modal";
import { TextInputModal } from "src/text-input-modal";
import {
	Context,
	getActiveProject,
	getProjectFromFile,
	getProjects,
	Project,
} from "src/projects";
import {
	createFileFromTemplate,
	getCategory,
	sanitizeFileName,
	vaultFileExists,
	Category,
} from "src/utilities";
import { ConductorSelectorModal } from "src/conductor-selector-modal";

const PROJECT_NOTE_TYPES = [
	"General Project Note",
	"Code Sample",
	"Log Sample",
	"Agent Response",
	"Design Note",
] as const;

type ProjectNoteType = (typeof PROJECT_NOTE_TYPES)[number];

export async function createProjectNote(app: App): Promise<void> {
	const editor = app.workspace.activeEditor?.editor;
	const selectedText = editor?.getSelection() ?? "";
	const activeProject = getProjectForActiveFile(app);

	const project = await chooseProject(app, activeProject);
	if (!project) return;

	const noteType = await chooseProjectNoteType(app);
	if (!noteType) return;

	const titleResult = await TextInputModal.show(app, {
		title: "Project Note Title",
		placeholder: `Enter a title for '${project.name}'...`,
		value: selectedText || undefined,
	});
	if (titleResult.cancelled) return;

	const title = sanitizeFileName(titleResult.value);
	if (!title) {
		new Notice("A project note title is required.");
		return;
	}

	let displayText: string | null = null;
	if (selectedText && title !== selectedText) {
		const displayResult = await TextInputModal.show(app, {
			title: "Link Text",
			placeholder: "Enter link text...",
			value: selectedText,
		});
		if (displayResult.cancelled) return;
		displayText = displayResult.value;
	}

	const filePath = getUniqueProjectNotePath(app, project.context, title);
	let note: TFile | null;
	try {
		note = await createFileFromTemplate(
			app,
			filePath,
			`Project Notes/${noteType}`,
		);
	} catch (error) {
		console.error(error);
		new Notice(
			`Failed to create project note [${title}]: ${error?.message ?? error}`,
		);
		return;
	}
	if (!note) {
		new Notice(`Project note template not found for ${noteType}.`);
		return;
	}

	await app.fileManager.processFrontMatter(note, (frontmatter) => {
		frontmatter.categories = ["[[Project Note]]"];
		frontmatter.type = `[[${noteType}]]`;
		frontmatter.parents = [`[[${project.name}]]`];
	});

	const link = createProjectNoteLink(note, displayText);
	if (editor) {
		insertProjectNoteLink(editor, link, Boolean(selectedText));
	} else {
		await app.workspace.getLeaf(false).openFile(note);
	}
}

function getProjectForActiveFile(app: App): Project | null {
	const activeProject = getActiveProject(app);
	if (activeProject) return activeProject;

	const file = app.workspace.activeEditor?.file;
	if (!file) return null;

	const parent = app.metadataCache.getFileCache(file)?.frontmatter?.parents;
	const link = Array.isArray(parent) ? parent[0] : parent;
	if (typeof link !== "string") return null;

	const linkedFile = app.metadataCache.getFirstLinkpathDest(
		link.replace(/^\[\[|\]\]$/g, "").split("|")[0],
		file.path,
	);
	return linkedFile && getCategory(app, linkedFile) === Category.Project
		? getProjectFromFile(app, linkedFile)
		: null;
}

async function chooseProject(
	app: App,
	activeProject: Project | null,
): Promise<Project | null> {
	if (!activeProject) {
		return showProjectSelector(app, getProjects(app));
	}

	return ConductorSelectorModal.show(app, {
		items: getProjects(app),
		placeholder: "Select a project...",
		initialValue: activeProject.name,
		getText: (project) => `${project.context} -> ${project.name}`,
		getSearchText: (project) =>
			`${project.context} -> ${project.name} ${project.jiraId}`,
		getBadges: (project) => (project.jiraId ? [project.jiraId] : []),
	});
}

function chooseProjectNoteType(app: App): Promise<ProjectNoteType | null> {
	return ConductorSelectorModal.show(app, {
		items: [...PROJECT_NOTE_TYPES],
		placeholder: "Select a project note type...",
		getText: (noteType) => noteType,
	});
}

function getUniqueProjectNotePath(
	app: App,
	context: Context,
	title: string,
): string {
	const directory = `Projects/${context}`;
	const baseName = `Project Note - ${title}`;
	let suffix = 1;
	let path = `${directory}/${baseName}.md`;

	while (vaultFileExists(app, path)) {
		suffix += 1;
		path = `${directory}/${baseName} ${suffix}.md`;
	}

	return path;
}

function createProjectNoteLink(note: TFile, displayText: string | null): string {
	return displayText === null || displayText === ""
		? `[[${note.basename}]]`
		: `[[${note.basename}|${displayText}]]`;
}

function insertProjectNoteLink(
	editor: Editor,
	link: string,
	hasSelection: boolean,
): void {
	if (hasSelection) {
		editor.replaceSelection(link);
	} else {
		editor.replaceRange(link, editor.getCursor());
	}
}
