import { App, Notice, moment } from "obsidian";
import { showProblemSelector } from "src/choose-problem-modal";
import { isNoteProblem } from "src/problems";
import { TextInputModal } from "src/text-input-modal";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";

export const createJournalNoteForProblem = async (app: App): Promise<void> => {
	const activeFile = app.workspace.activeEditor?.file;
	const preselectedFiles =
		activeFile && isNoteProblem(app, activeFile) ? [activeFile] : [];

	const problems = await showProblemSelector(app, preselectedFiles);
	if (problems.length === 0) return;

	const prompt = await TextInputModal.show(app, {
		title: "Title of journal note",
		placeholder: "Enter title...",
	});
	if (prompt.cancelled) return;

	const title = prompt.value.trim();
	if (!title) {
		new Notice("Journal note title cannot be blank");
		return;
	}

	const fileName = getUniqueJournalFileName(
		app,
		`${moment().format("YYYY-MM-DD HHmm")} - ${sanitizeFileName(title)}`,
	);
	const filePath = `${fileName}.md`;

	const file = await createFileFromTemplate(app, filePath, "Journal");
	if (!file) {
		new Notice("Failed to create journal note. Template may be missing.");
		return;
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.categories = Array.isArray(fm.categories) ? fm.categories : [];
		if (!fm.categories.includes("[[Journal]]")) {
			fm.categories.push("[[Journal]]");
		}
		fm.problems = problems.map((problem) => `[[${problem.name}]]`);
	});

	app.workspace.getLeaf(false).openFile(file);
};

function getUniqueJournalFileName(app: App, baseName: string): string {
	if (!app.vault.getFileByPath(`${baseName}.md`)) {
		return baseName;
	}

	let counter = 2;
	while (true) {
		const proposedName = `${baseName} (${counter})`;
		const proposedPath = `${proposedName}.md`;
		if (!app.vault.getFileByPath(proposedPath)) {
			return proposedName;
		}
		counter++;
	}
}
