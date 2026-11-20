import { App, Notice, parseYaml } from "obsidian";

const BASE_FILE_NAME = "Tasks.base";
const VIEW_NAME = "Created Today";

export const viewTasksCreatedToday = async (app: App): Promise<void> => {
	const file = app.vault.getFiles().find((f) => f.name === BASE_FILE_NAME);
	if (!file) {
		new Notice(`${BASE_FILE_NAME} not found`);
		return;
	}

	try {
		const content = await app.vault.cachedRead(file);
		const base = parseYaml(content);
		const views = Array.isArray(base?.views) ? base.views : [];
		const viewExists = views.some(
			(view: { name?: unknown }) => view?.name === VIEW_NAME,
		);
		if (!viewExists) {
			new Notice(
				`View "${VIEW_NAME}" no longer exists in ${BASE_FILE_NAME}`,
			);
			return;
		}
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		new Notice(`Unable to validate ${BASE_FILE_NAME}: ${detail}`);
		return;
	}

	await app.workspace.openLinkText(
		`${BASE_FILE_NAME}#${VIEW_NAME}`,
		"",
		false,
	);
};
