import { App, Notice } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import { getActiveProject, getProjects, Project } from "src/projects";
import { createNewTask } from "src/tasks";

interface CheckboxLine {
	lineIndex: number;
	indent: string;
	text: string;
	nestedBullets: string[];
}

export const createNewTasksFromCheckboxes = async (app: App) => {
	// Get the active editor
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) {
		new Notice("No active editor found");
		return;
	}

	// Get selected text or current line
	let selectedText = editor.getSelection();
	let selectionRange: {
		from: { line: number; ch: number };
		to: { line: number; ch: number };
	} | null = null;

	if (!selectedText) {
		const cursor = editor.getCursor();
		selectedText = editor.getLine(cursor.line);
		selectionRange = {
			from: { line: cursor.line, ch: 0 },
			to: { line: cursor.line, ch: selectedText.length },
		};
	} else {
		selectionRange = {
			from: editor.getCursor("from"),
			to: editor.getCursor("to"),
		};
	}

	// Find all lines with unchecked checkboxes (excluding those that already contain links)
	const lines = selectedText.split("\n");
	const checkboxPattern = /^(\s*)- \[ \] (.+)$/;
	const linkPattern = /\[\[.+\]\]/;
	const bulletPattern = /^(\s*)[-*] (.+)$/;
	const checkboxLines: CheckboxLine[] = [];

	lines.forEach((line, index) => {
		const match = line.match(checkboxPattern);
		if (match) {
			const checkboxText = match[2];
			// Skip checkboxes that already contain a link
			if (!linkPattern.test(checkboxText)) {
				checkboxLines.push({
					lineIndex: index,
					indent: match[1],
					text: checkboxText.trim(),
					nestedBullets: [],
				});
			}
		} else if (checkboxLines.length > 0) {
			// Check if this is a nested bullet point
			const bulletMatch = line.match(bulletPattern);
			if (bulletMatch) {
				const lastCheckbox = checkboxLines[checkboxLines.length - 1];
				const bulletIndent = bulletMatch[1];
				// If this bullet is indented more than the last checkbox, it's nested
				if (bulletIndent.length > lastCheckbox.indent.length) {
					lastCheckbox.nestedBullets.push(line);
				}
			}
		}
	});

	// Check if any unchecked checkboxes were found
	if (checkboxLines.length === 0) {
		new Notice("No unchecked checkboxes found");
		return;
	}

	// Get or prompt for active project
	let selectedProject = getActiveProject(app);

	if (!selectedProject) {
		// Prompt user to select a project
		const projects = getProjects(app);
		selectedProject = await new Promise<Project | null>((resolve) => {
			const selectProjectModal = new ChooseProjectModal(app);
			selectProjectModal.projects = projects;
			selectProjectModal.onChoose = (project: Project) => {
				resolve(project);
			};
			selectProjectModal.open();
		});

		if (!selectedProject) {
			new Notice("No project selected");
			return;
		}
	}

	// Create tasks for each checkbox
	let createdCount = 0;
	const replacements: { lineIndex: number; newLine: string }[] = [];

	for (const checkboxLine of checkboxLines) {
		const templateName = checkboxLine.text.endsWith("?")
			? "Question Task"
			: "Task";
		const task = await createNewTask(
			app,
			checkboxLine.text,
			selectedProject,
			templateName,
		);
		if (task) {
			createdCount++;

			// If there are nested bullets, append them to the task file
			if (checkboxLine.nestedBullets.length > 0) {
				const taskFile = task.file;
				const currentContent = await app.vault.read(taskFile);

				// Find the minimum indentation level among nested bullets
				let minIndent = Infinity;
				checkboxLine.nestedBullets.forEach((bullet) => {
					const match = bullet.match(/^(\s*)/);
					if (match) {
						minIndent = Math.min(minIndent, match[1].length);
					}
				});

				// Remove the minimum indentation from all bullets
				const normalizedBullets = checkboxLine.nestedBullets.map(
					(bullet) => {
						return bullet.substring(minIndent);
					},
				);

				const notesSection = `\n# Notes\n\n${normalizedBullets.join("\n")}\n`;
				await app.vault.modify(taskFile, currentContent + notesSection);
			}

			const newLine = `${checkboxLine.indent}- [ ] [[${task.name}]]`;
			replacements.push({
				lineIndex: checkboxLine.lineIndex,
				newLine,
			});
		}
	}

	// Replace the checkbox lines with links to the created tasks
	if (replacements.length > 0 && selectionRange) {
		const updatedLines = [...lines];
		replacements.forEach(({ lineIndex, newLine }) => {
			updatedLines[lineIndex] = newLine;
		});

		const newText = updatedLines.join("\n");
		editor.replaceRange(newText, selectionRange.from, selectionRange.to);
	}

	// Display success message
	new Notice(
		`Created ${createdCount} task${createdCount !== 1 ? "s" : ""} for project [${selectedProject.name}]`,
	);
};