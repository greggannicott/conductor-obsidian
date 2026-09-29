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
import { TemplateVars } from "src/template-vars";
import { ConductorSelectorModal } from "src/conductor-selector-modal";

const PROJECT_NOTE_TYPES = [
	"General Project Note",
	"Code Sample",
	"Log Sample",
	"Agent Response",
	"Design Note",
] as const;

type ProjectNoteType = (typeof PROJECT_NOTE_TYPES)[number];

type NoteContentContext = {
	language: string | null;
	content: string;
};

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

	const displayResult = await TextInputModal.show(app, {
		title: "Link Text",
		placeholder: "Enter link text...",
		value: title,
	});
	if (displayResult.cancelled) return;
	// '|' and the ']]' terminator would break the wikilink built from this.
	const displayText = displayResult.value.replace(/\|/g, "").replace(/]]/g, "]");

	const requiresContent =
		noteType === "Code Sample" ||
		noteType === "Log Sample" ||
		noteType === "Agent Response";
	const noteContentContext = requiresContent
		? await gatherNoteContentContext(app, noteType)
		: null;
	if (requiresContent && noteContentContext === null) return;

	const filePath = getUniqueProjectNotePath(app, project.context, title);
	const templateVars = buildTemplateVars({
		project,
		noteType,
		title,
		displayText,
		selectedText,
		noteContentContext,
	});

	let note: TFile | null;
	try {
		note = await createFileFromTemplate(
			app,
			filePath,
			`Project Notes/${noteType}`,
			templateVars,
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

// The vocabulary a `Project Notes/*` template can reference. Keys with no
// value are omitted so the placeholder stays literal, matching the
// unknown-name behaviour.
function buildTemplateVars(input: {
	project: Project;
	noteType: ProjectNoteType;
	title: string;
	displayText: string;
	selectedText: string;
	noteContentContext: NoteContentContext | null;
}): TemplateVars {
	const { project, noteType, title, displayText, selectedText } = input;
	const vars: TemplateVars = {
		title,
		link_text: displayText,
		project: project.name,
		project_path: project.path,
		context: project.context,
		note_type: noteType,
	};

	// No selection means the value was never collected, so it stays literal.
	if (selectedText) vars.selected_text = selectedText;

	// Content and language were explicitly submitted, so an empty string here
	// is a real value and should substitute to nothing rather than survive
	// as a literal placeholder in the note.
	if (input.noteContentContext) {
		const { language, content } = input.noteContentContext;
		if (language !== null) vars.language = language;
		vars.content = content;
	}

	const optional: Array<[string, string | undefined | null]> = [
		["jira_id", project.jiraId],
		["branch", project.branch],
		["project_id", project.projectId],
		["repo_directory_name", project.repoDirectoryName],
		["status", project.status],
		["ongoing", project.ongoing ? "true" : null],
	];
	for (const [key, value] of optional) {
		if (value) vars[key] = value;
	}

	return vars;
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

function chooseProject(
	app: App,
	activeProject: Project | null,
): Promise<Project | null> {
	return showProjectSelector(
		app,
		getProjects(app),
		activeProject?.name,
	);
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

function createProjectNoteLink(note: TFile, displayText: string): string {
	return displayText === ""
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

async function gatherNoteContentContext(
	app: App,
	noteType: ProjectNoteType,
): Promise<NoteContentContext | null> {
	let language: string | null = null;
	if (noteType === "Code Sample") {
		language = await chooseCodeLanguage(app);
		// Cancelling the language picker cancels the whole flow, the same as
		// cancelling the content prompt does.
		if (language === null) return null;
	}
	const clipboardText = await readClipboardText();
	const result = await TextInputModal.show(app, {
		title: "Content",
		placeholder:
			noteType === "Code Sample"
				? "Paste your code..."
				: `Paste ${noteType.toLowerCase()} content...`,
		value: clipboardText || undefined,
		multiline: true,
	});
	if (result.cancelled) return null;

	return { language, content: result.value };
}

async function chooseCodeLanguage(app: App): Promise<string | null> {
	return ConductorSelectorModal.show(app, {
		items: getCodeBlockLanguages(),
		placeholder: "Select a programming language...",
		getText: (language) => language,
	});
}

type CodeMirrorModeInfo = {
	name?: unknown;
	mode?: unknown;
	alias?: unknown;
};

function getCodeBlockLanguages(): string[] {
	const codeMirror = (
		window as unknown as { CodeMirror?: { modeInfo?: CodeMirrorModeInfo[] } }
	).CodeMirror;
	const modeInfo = codeMirror?.modeInfo;
	if (!Array.isArray(modeInfo)) return [];

	const languages = new Set<string>();
	for (const mode of modeInfo) {
		if (typeof mode.name === "string" && mode.name.length > 0) {
			languages.add(mode.name);
		}
		if (typeof mode.mode === "string" && mode.mode.length > 0) {
			languages.add(mode.mode);
		}
		if (Array.isArray(mode.alias)) {
			for (const alias of mode.alias) {
				if (typeof alias === "string" && alias.length > 0) {
					languages.add(alias);
				}
			}
		}
	}
	return [...languages].sort();
}

async function readClipboardText(): Promise<string> {
	try {
		return await navigator.clipboard.readText();
	} catch {
		return "";
	}
}
