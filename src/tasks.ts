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
	type: TaskType[];
};

export enum TaskStatus {
	ToDo = "01 - To Do",
	Doing = "02 - Doing",
	Done = "03 - Done",
	Abandoned = "04 - Abandoned",
}

export const incompletedTaskTypes: TaskStatus[] = [
	TaskStatus.ToDo,
	TaskStatus.Doing,
];

export enum TaskPriority {
	High = "01 - High",
	Medium = "02 - Medium",
	Low = "03 - Low",
}

export enum TaskType {
	BlogPost = "[[Blog Post]]",
	QuestionTask = "[[Question Task]]",
}

export type TaskFilters = {
	projectFilter?: ProjectFilter;
	statusFilter?: StatusFilter;
	typeFilter?: TypeFilter;
	impededFilter?: ImpededFilter;
};

type ProjectFilter = {
	projectIs: string[];
};

type StatusFilter = {
	statusIs: TaskStatus[];
};

type TypeFilter = {
	typeIncludes?: TaskType[];
	typeExcludes?: TaskType[];
};

type ImpededFilter = {
	impededIs: boolean;
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
		const types = frontmatter && frontmatter["type"];
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
			type: types,
		};
	} else {
		console.error(`Unable to create task from file [${filePath}]`);
		return null;
	}
}

// Get a list of tasks.
// A task is a file that includes a `categories` value of "[[Task]]".
// By default, only incomplete tasks are returned.
export function getTasks(
	app: App,
	overideFilters?: TaskFilters,
): (Task | null)[] {
	let filters: TaskFilters = {
		projectFilter: undefined,
		statusFilter: {
			statusIs: incompletedTaskTypes,
		},
		typeFilter: undefined,
	};
	if (overideFilters) {
		filters = {
			...filters,
			...overideFilters,
		};
	}
	const tasks = getFilesWithCategory(app, "Task")
		.map((t: TFile): Task | null => {
			return getTask(app, t.path);
		})
		.filter((t: Task) => {
			if (filters.projectFilter) {
				return (
					t?.parents &&
					filters.projectFilter.projectIs.includes(t.parents[0].name)
				);
			}
			return true;
		})
		.filter((t: Task) => {
			if (filters.statusFilter) {
				return (
					t &&
					t.status &&
					filters.statusFilter.statusIs.includes(t.status)
				);
			}
			return true;
		})
		.filter((t: Task) => {
			if (filters.typeFilter?.typeIncludes) {
				for (
					let i = 0;
					i < filters.typeFilter.typeIncludes.length;
					i++
				) {
					const includeType = filters.typeFilter.typeIncludes[i];
					for (let j = 0; j < t.type?.length; j++) {
						const taskType = t.type[j];
						if (taskType === includeType) {
							return true;
						}
					}
				}
				return false;
			}
			return true;
		})
		.filter((t: Task) => {
			if (filters.typeFilter?.typeExcludes) {
				if (!t.type) {
					return true;
				}
				for (
					let i = 0;
					i < filters.typeFilter.typeExcludes.length;
					i++
				) {
					const excludeType = filters.typeFilter.typeExcludes[i];
					for (let j = 0; j < t.type.length; j++) {
						const taskType = t.type[j];
						if (taskType === excludeType) {
							return false;
						}
					}
				}
			}
			return true;
		})
		.filter((t: Task) => {
			if (filters.impededFilter) {
				return t.impeded === filters.impededFilter.impededIs;
			}
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
