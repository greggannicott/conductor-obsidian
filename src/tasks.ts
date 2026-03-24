import { App, TFile } from "obsidian";
import { Context, getProjectFromLink, Project } from "./projects";
import {
	Category,
	createFileFromTemplate,
	getCategory,
	getFilesWithCategory,
	vaultFileExists,
} from "./utilities";

export type Task = {
	name: string;
	path: string;
	file: TFile;
	parents: Project[];
	status: TaskStatus;
	jiraId: string;
	impeded: boolean;
	priority: TaskPriority;
	branch: string;
};

export enum TaskStatus {
	ToDo = "01 - To Do",
	Doing = "02 - Doing",
	Done = "03 - Done",
	Abandoned = "04 - Abandoned",
}

export enum TaskPriority {
	High = "01 - High",
	Medium = "02 - Medium",
	Low = "03 - Low",
}

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
		const parents =
			frontmatter &&
			frontmatter["parents"]?.map((link: string) => {
				return getProjectFromLink(app, link, filePath);
			});
		const status = frontmatter && frontmatter["status"];
		const jiraId = frontmatter && frontmatter["jira-id"];
		const impeded =
			frontmatter && frontmatter["impeded"] === true ? true : false;
		const priority = frontmatter && frontmatter["priority"];
		const branch = frontmatter && frontmatter["branch"];
		return {
			name,
			path: filePath,
			parents,
			file,
			status,
			jiraId,
			impeded,
			priority,
			branch,
		};
	} else {
		console.error(`Unable to create task from file [${filePath}]`);
		return null;
	}
}

export type getTaskOptions = {
	project: Project | null;
	excludeCompletedTasks?: boolean;
};

// Get a list of tasks.
// A task is a file that includes a `categories` value of "[[Task]]"
export function getTasks(
	app: App,
	overrideOptions?: getTaskOptions,
): (Task | null)[] {
	let options: getTaskOptions = {
		project: null,
		excludeCompletedTasks: true,
	};
	if (overrideOptions) {
		options = {
			...options,
			...overrideOptions,
		};
	}
	const tasks = getFilesWithCategory(app, "Task")
		.map((t: TFile): Task | null => {
			return getTask(app, t.path);
		})
		.filter((t) => {
			if (options.project) {
				return t?.parents && options.project.name === t.parents[0].name;
			}
			return true;
		})
		.filter((t) => {
			if (options.excludeCompletedTasks) {
				return (
					t?.status === TaskStatus.ToDo ||
					t?.status === TaskStatus.Doing
				);
			}
			return true;
		});
	return tasks;
}

export async function updateTask(app: App, task: Task): Promise<void> {
	const file = app.vault.getFileByPath(task.path);
	if (file) {
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["status"] = task.status;
			fm["jira-id"] = task.jiraId;
			fm["impeded"] = task.impeded;
			fm["priority"] = task.priority;
			fm["branch"] = task.branch;
		});
	}
}

// The task that is currently active.
// A task is active if the focussed file is a task.
export function getActiveTask(app: App): Task | null {
	const activeFile = app.workspace.activeEditor?.file;
	let activeTask!: Task | null;
	if (activeFile) {
		if (getCategory(app, activeFile) == Category.Task) {
			activeTask = getTask(app, activeFile.path);
		}
	}
	return activeTask;
}
