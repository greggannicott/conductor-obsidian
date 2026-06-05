import { App, Editor, Notice, moment } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import { getActiveProject, getProjects, Project } from "src/projects";
import { createNewTask, TaskPriority, TaskStatus } from "src/tasks";

type EditorLike = Editor;
type EditorPosition = { line: number; ch: number };
type SelectionRange = { from: EditorPosition; to: EditorPosition };

interface CheckboxLine {
	lineIndex: number;
	indent: string;
	text: string;
	nestedBullets: string[];
}

interface SelectedEditorContent {
	lines: string[];
	range: SelectionRange;
}

interface LineReplacement {
	lineIndex: number;
	newLine: string;
}

const checkboxPattern = /^(\s*)- \[ \] (.+)$/;
const linkPattern = /\[\[.+\]\]/;
const bulletPattern = /^(\s*)[-*] (.+)$/;
const answerPrefixPattern = /^answer:/i;
const priorityPrefixPattern = /^priority:/i;

export const createNewTasksFromCheckboxes = async (app: App): Promise<void> => {
	const editor = getActiveEditorOrNotify(app);
	if (!editor) return;

	const selectedEditorContent = getSelectedEditorContent(editor);
	const checkboxLines = collectCheckboxLines(selectedEditorContent.lines);
	if (!hasCheckboxLinesOrNotify(checkboxLines)) return;

	const selectedProject = await getSelectedProjectOrNotify(app);
	if (!selectedProject) return;

	const { createdCount, replacements } = await createTasksAndReplacements(
		app,
		checkboxLines,
		selectedProject,
	);
	replaceCheckboxesWithTaskLinks(editor, selectedEditorContent, replacements);
	showTaskCreationNotice(createdCount, selectedProject);
};

const getActiveEditorOrNotify = (app: App): EditorLike | null => {
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) {
		new Notice("No active editor found");
		return null;
	}
	return editor;
};

const getSelectedEditorContent = (
	editor: EditorLike,
): SelectedEditorContent => {
	const selectedText = editor.getSelection();
	if (!selectedText) {
		return getCurrentLineContent(editor);
	}

	const range = {
		from: editor.getCursor("from"),
		to: editor.getCursor("to"),
	};
	return { lines: selectedText.split("\n"), range };
};

const getCurrentLineContent = (editor: EditorLike): SelectedEditorContent => {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const range = {
		from: { line: cursor.line, ch: 0 },
		to: { line: cursor.line, ch: line.length },
	};
	return { lines: [line], range };
};

const collectCheckboxLines = (lines: string[]): CheckboxLine[] => {
	const checkboxLines: CheckboxLine[] = [];
	lines.forEach((line, index) => {
		addCheckboxLineIfPresent(checkboxLines, line, index);
		addNestedBulletIfPresent(checkboxLines, line);
	});
	return checkboxLines;
};

const addCheckboxLineIfPresent = (
	checkboxLines: CheckboxLine[],
	line: string,
	index: number,
) => {
	const match = line.match(checkboxPattern);
	if (!match) return;

	const checkboxText = match[2];
	if (linkPattern.test(checkboxText)) return;

	checkboxLines.push({
		lineIndex: index,
		indent: match[1],
		text: checkboxText.trim(),
		nestedBullets: [],
	});
};

const addNestedBulletIfPresent = (
	checkboxLines: CheckboxLine[],
	line: string,
) => {
	if (checkboxLines.length === 0) return;

	const bulletMatch = line.match(bulletPattern);
	if (!bulletMatch) return;

	const lastCheckbox = checkboxLines[checkboxLines.length - 1];
	const bulletIndent = bulletMatch[1];
	if (bulletIndent.length <= lastCheckbox.indent.length) return;

	lastCheckbox.nestedBullets.push(line);
};

const hasCheckboxLinesOrNotify = (checkboxLines: CheckboxLine[]): boolean => {
	if (checkboxLines.length > 0) return true;

	new Notice("No unchecked checkboxes found");
	return false;
};

const getSelectedProjectOrNotify = async (
	app: App,
): Promise<Project | null> => {
	const activeProject = getActiveProject(app);
	if (activeProject) return activeProject;

	const selectedProject = await promptForProjectSelection(app);
	if (selectedProject) return selectedProject;

	new Notice("No project selected");
	return null;
};

const promptForProjectSelection = (app: App): Promise<Project | null> => {
	const projects = getProjects(app);
	return new Promise<Project | null>((resolve) => {
		const selectProjectModal = new ChooseProjectModal(app);
		selectProjectModal.projects = projects;
		selectProjectModal.onChoose = (project: Project) => {
			resolve(project);
		};
		selectProjectModal.open();
	});
};

const createTasksAndReplacements = async (
	app: App,
	checkboxLines: CheckboxLine[],
	selectedProject: Project,
): Promise<{ createdCount: number; replacements: LineReplacement[] }> => {
	let createdCount = 0;
	const replacements: LineReplacement[] = [];

	for (const checkboxLine of checkboxLines) {
		const task = await createTaskForCheckbox(
			app,
			checkboxLine,
			selectedProject,
		);
		if (!task) continue;

		createdCount++;
		await applyPriorityIfPresent(app, task.file, checkboxLine);
		await applyQuestionAnswerIfPresent(app, task.file, checkboxLine);
		await appendNestedBulletsToTaskNotes(
			app,
			task.file,
			filterNestedBulletsForNotes(checkboxLine.nestedBullets),
		);
		replacements.push(buildLineReplacement(checkboxLine, task.name));
	}

	return { createdCount, replacements };
};

const createTaskForCheckbox = (
	app: App,
	checkboxLine: CheckboxLine,
	selectedProject: Project,
) => {
	const templateName = isQuestionCheckbox(checkboxLine.text)
		? "Question Task"
		: "Task";
	return createNewTask(app, checkboxLine.text, selectedProject, templateName);
};

const isQuestionCheckbox = (checkboxText: string): boolean => {
	return checkboxText.endsWith("?");
};

const applyQuestionAnswerIfPresent = async (
	app: App,
	taskFile: Parameters<App["vault"]["read"]>[0],
	checkboxLine: CheckboxLine,
) => {
	if (!isQuestionCheckbox(checkboxLine.text)) return;

	const answer = findFirstAnswer(checkboxLine.nestedBullets);
	if (!answer) return;

	await app.fileManager.processFrontMatter(taskFile, (fm) => {
		fm["answer"] = answer;
		fm["status"] = TaskStatus.Done;
	});
};

const findFirstAnswer = (nestedBullets: string[]): string | null => {
	for (const bullet of nestedBullets) {
		const answer = extractAnswerFromBullet(bullet);
		if (answer !== null) return answer;
	}
	return null;
};

const extractAnswerFromBullet = (bullet: string): string | null => {
	const bulletMatch = bullet.match(bulletPattern);
	if (!bulletMatch) return null;

	const bulletText = bulletMatch[2].trim();
	if (!answerPrefixPattern.test(bulletText)) return null;

	return bulletText.replace(answerPrefixPattern, "").trim();
};

const applyPriorityIfPresent = async (
	app: App,
	taskFile: Parameters<App["vault"]["read"]>[0],
	checkboxLine: CheckboxLine,
) => {
	const priority = findFirstPriority(checkboxLine.nestedBullets);
	if (!priority) return;
	const priorityChangeDt = moment().format("YYYY-MM-DDTHH:mm:ss");

	await app.fileManager.processFrontMatter(taskFile, (fm) => {
		fm["priority"] = priority;
		fm["meta-last-priority-change-dt"] = priorityChangeDt;
	});
};

const findFirstPriority = (nestedBullets: string[]): TaskPriority | null => {
	for (const bullet of nestedBullets) {
		const priority = extractPriorityFromBullet(bullet);
		if (priority !== null) return priority;
	}
	return null;
};

const extractPriorityFromBullet = (bullet: string): TaskPriority | null => {
	const bulletMatch = bullet.match(bulletPattern);
	if (!bulletMatch) return null;

	const bulletText = bulletMatch[2].trim();
	if (!priorityPrefixPattern.test(bulletText)) return null;

	const priorityValue = bulletText.replace(priorityPrefixPattern, "").trim();
	return parsePriorityValue(priorityValue);
};

const parsePriorityValue = (value: string): TaskPriority | null => {
	const normalizedValue = value.toLowerCase();
	if (
		normalizedValue === "01 - high" ||
		normalizedValue === "01" ||
		normalizedValue === "high"
	) {
		return TaskPriority.High;
	}
	if (
		normalizedValue === "02 - medium" ||
		normalizedValue === "02" ||
		normalizedValue === "medium"
	) {
		return TaskPriority.Medium;
	}
	if (
		normalizedValue === "03 - low" ||
		normalizedValue === "03" ||
		normalizedValue === "low"
	) {
		return TaskPriority.Low;
	}
	return null;
};

const appendNestedBulletsToTaskNotes = async (
	app: App,
	taskFile: Parameters<App["vault"]["read"]>[0],
	nestedBullets: string[],
) => {
	if (nestedBullets.length === 0) return;

	const currentContent = await app.vault.read(taskFile);
	const normalizedBullets = normalizeBullets(nestedBullets);
	const notesSection = `\n# Notes\n\n${normalizedBullets.join("\n")}\n`;
	await app.vault.modify(taskFile, currentContent + notesSection);
};

const filterNestedBulletsForNotes = (nestedBullets: string[]): string[] => {
	return nestedBullets.filter((bullet) => {
		const bulletMatch = bullet.match(bulletPattern);
		if (!bulletMatch) return true;

		return !priorityPrefixPattern.test(bulletMatch[2].trim());
	});
};

const normalizeBullets = (nestedBullets: string[]): string[] => {
	const minIndent = getMinimumIndentation(nestedBullets);
	return nestedBullets.map((bullet) => bullet.substring(minIndent));
};

const getMinimumIndentation = (nestedBullets: string[]): number => {
	let minIndent = Infinity;
	nestedBullets.forEach((bullet) => {
		const match = bullet.match(/^(\s*)/);
		if (match) {
			minIndent = Math.min(minIndent, match[1].length);
		}
	});
	return minIndent;
};

const buildLineReplacement = (
	checkboxLine: CheckboxLine,
	taskName: string,
): LineReplacement => {
	return {
		lineIndex: checkboxLine.lineIndex,
		newLine: `${checkboxLine.indent}- [ ] [[${taskName}]]`,
	};
};

const replaceCheckboxesWithTaskLinks = (
	editor: EditorLike,
	selectedEditorContent: SelectedEditorContent,
	replacements: LineReplacement[],
) => {
	if (replacements.length === 0) return;

	const updatedLines = [...selectedEditorContent.lines];
	replacements.forEach(({ lineIndex, newLine }) => {
		updatedLines[lineIndex] = newLine;
	});

	const newText = updatedLines.join("\n");
	editor.replaceRange(
		newText,
		selectedEditorContent.range.from,
		selectedEditorContent.range.to,
	);
};

const showTaskCreationNotice = (
	createdCount: number,
	selectedProject: Project,
) => {
	new Notice(
		`Created ${createdCount} task${createdCount !== 1 ? "s" : ""} for project [${selectedProject.name}]`,
	);
};
