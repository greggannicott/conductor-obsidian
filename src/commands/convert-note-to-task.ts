import { App, Notice, TFile, moment } from "obsidian";
import { ChooseProjectModal } from "src/choose-project-modal";
import { getProjects, Project } from "src/projects";
import { Category, getCategory, vaultFileExists } from "src/utilities";

export const convertNoteToTask = async (
	app: App,
	targetFile?: TFile,
): Promise<void> => {
	const file = targetFile ?? app.workspace.activeEditor?.file;
	if (!file) {
		new Notice("No active note to convert.");
		return;
	}

	const blockReason = getConversionBlockReason(app, file);
	if (blockReason) {
		new Notice(blockReason);
		return;
	}

	const project = await promptForProject(app);
	if (!project) {
		new Notice("No project selected.");
		return;
	}

	const targetPath = getTargetTaskPath(app, file, project);
	if (targetPath !== file.path) {
		await app.vault.rename(file, targetPath);
	}

	const taskFile = app.vault.getFileByPath(targetPath);
	if (!taskFile) {
		new Notice(`Failed to convert note to task [${file.name}]`);
		return;
	}

	await applyTaskFrontmatter(app, taskFile, project);

	new Notice(
		`Converted [${taskFile.basename}] to a task in project [${project.name}]`,
	);
};

export const isNoteConvertible = (app: App, file: TFile): boolean => {
	return getConversionBlockReason(app, file) === null;
};

const getConversionBlockReason = (app: App, file: TFile): string | null => {
	if (file.extension !== "md") {
		return `[${file.name}] is not a markdown note.`;
	}
	if (file.path.startsWith("_templates/")) {
		return "Templates cannot be converted to tasks.";
	}
	const category = getCategory(app, file);
	if (category === Category.Task) {
		return `[${file.name}] is already a task.`;
	}
	if (category === Category.Project) {
		return `[${file.name}] is a project and cannot be converted to a task.`;
	}
	return null;
};

const promptForProject = (app: App): Promise<Project | null> => {
	const projects = getProjects(app);
	return new Promise<Project | null>((resolve) => {
		const modal = new ChooseProjectModal(app);
		modal.projects = projects;
		modal.onChoose = (project: Project) => resolve(project);
		modal.open();
	});
};

const getTargetTaskPath = (
	app: App,
	file: TFile,
	project: Project,
): string => {
	const sanitizedName = file.basename.replace(/[:\\/]/g, "");
	const basePath = `Projects/${project.context}/${sanitizedName}.md`;
	if (basePath === file.path || !vaultFileExists(app, basePath)) {
		return basePath;
	}

	let postfix = 0;
	let proposed = sanitizedName;
	let taken = true;
	while (taken) {
		postfix++;
		proposed = `${sanitizedName} - ${postfix}`;
		taken = vaultFileExists(
			app,
			`Projects/${project.context}/${proposed}.md`,
		);
	}
	return `Projects/${project.context}/${proposed}.md`;
};

const applyTaskFrontmatter = async (
	app: App,
	file: TFile,
	project: Project,
): Promise<void> => {
	const templateDefaults = getTaskTemplateFrontmatter(app);
	const now = moment().format("YYYY-MM-DDTHH:mm:ss");

	await app.fileManager.processFrontMatter(file, (fm) => {
		for (const [key, value] of Object.entries(templateDefaults)) {
			if (fm[key] === undefined || fm[key] === null) {
				fm[key] = value;
			}
		}

		const categories = Array.isArray(fm["categories"])
			? (fm["categories"] as string[])
			: [];
		fm["categories"] = categories.includes("[[Task]]")
			? categories
			: [...categories, "[[Task]]"];

		fm["parents"] = [`[[${project.name}]]`];
		fm["meta-last-priority-change-dt"] = now;
		fm["meta-last-status-change-dt"] = now;
	});
};

const getTaskTemplateFrontmatter = (
	app: App,
): Record<string, unknown> => {
	const template = app.vault.getFileByPath("_templates/Task.md");
	return template
		? (app.metadataCache.getFileCache(template)?.frontmatter ?? {})
		: {};
};
