import { App, TFile } from "obsidian";
import { Context, Project } from "./projects";
import {
	createFileFromTemplate,
	getFilesWithCategory,
	vaultFileExists,
} from "./utilities";

export type Task = {
	name: string;
	path: string;
	file: TFile;
	parents: string[];
};

export async function createNewTask(
	app: App,
	taskName: string,
	selectedProject: Project,
): Promise<Task | null> {
	const uniqueFileName = getUniqueTaskFileName(
		app,
		taskName,
		selectedProject.context,
	);
	const filePath = `Projects/${selectedProject.context}/${uniqueFileName}.md`;

	const file = await createFileFromTemplate(app, filePath, "Task");

	// Update the frontmatter value to set a parent project.
	if (file) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["parents"] = [`[[${selectedProject.name}]]`];
		});
		const newTask = getTask(app, filePath);
		return newTask;
	} else {
		console.error(`Task file [${filePath}] does not exist`);
		return null;
	}
}

function getUniqueTaskFileName(
	app: App,
	taskName: string,
	context: Context,
): string {
	const sanitizedName = taskName.replace(/[:\\/]/g, "");
	const path = `Projects/${context}/${sanitizedName}.md`;
	if (!vaultFileExists(app, path)) {
		return sanitizedName;
	}

	// Name is already taken. Find the next available one.
	let postfix = 0;
	let proposedTaskName = "";
	let taken = true;
	while (taken == true) {
		postfix++;
		proposedTaskName = `${sanitizedName} - ${postfix}`;
		const proposedPath = `Projects/${context}/${proposedTaskName}.md`;
		if (!vaultFileExists(app, proposedPath)) {
			taken = false;
		}
	}
	return proposedTaskName;
}

export function getTask(app: App, filePath: string): Task | null {
	const file = app.vault.getFileByPath(filePath);
	if (file) {
		const name = file.basename;
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		const parents = frontmatter && frontmatter["parents"];
		return {
			name,
			path: filePath,
			parents,
			file,
		};
	} else {
		console.error(`Unable to create task from file [${filePath}]`);
		return null;
	}
}

// Get a list of tasks.
// A task is a file that includes a `categories` value of "[[Task]]"
export function getTasks(app: App, project?: Project | null): Task[] {
	const tasks: Task[] = getFilesWithCategory(app, "Task")
		.map((t: TFile) => {
			const frontmatter = app.metadataCache.getFileCache(t)?.frontmatter;
			const parents = frontmatter?.parents?.map((p: string) => {
				const matches = p.match(/\[\[(.+)\]\]/);
				if (matches && matches.length > 0) {
					return matches[1];
				} else {
					return null;
				}
			});
			const context = t.path.startsWith("Projects/Work")
				? "Work"
				: "Personal";
			return {
				name: t.basename,
				path: t.path,
				context,
				parents,
				file: t,
			};
		})
		.filter((t) => {
			if (project) {
				return project.name == t.parents[0];
			}
			return true;
		});
	return tasks;
}
