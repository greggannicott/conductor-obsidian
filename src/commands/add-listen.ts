import { App, Notice, TFile } from "obsidian";
import { createFileFromTemplate, sanitizeFileName } from "src/utilities";

function formatDateTime(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = date.getFullYear();
	const mm = pad(date.getMonth() + 1);
	const dd = pad(date.getDate());
	const hh = pad(date.getHours());
	const mi = pad(date.getMinutes());
	const ss = pad(date.getSeconds());
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
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

export const addListen = async (app: App, file: TFile): Promise<void> => {
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm["listens"] = (fm["listens"] ?? 0) + 1;
	});

	const now = new Date();
	const dateTime = formatDateTime(now);
	const title = `${dateTime} - Listen`;
	const fileName = `${title}.md`;
	const filePath = getUniqueFilePath(
		app,
		`_consumptions/${sanitizeFileName(fileName)}`,
	);

	const listenFile = await createFileFromTemplate(app, filePath, "Listen");
	if (!listenFile) {
		new Notice(
			"Failed to create listen note. Is the 'Listen' template available?",
		);
		return;
	}

	await app.fileManager.processFrontMatter(listenFile, (fm) => {
		fm["music-release"] = `[[${file.basename}]]`;
		fm["date-time"] = dateTime;
	});

	await app.workspace.getLeaf(false).openFile(listenFile);
	new Notice(`Created listen note: ${listenFile.basename}`);
};
