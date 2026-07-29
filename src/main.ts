import { Plugin } from "obsidian";

import {
	createNewTasksFromCheckboxes,
} from "./commands/create-tasks-from-checkboxes";
import { createNewNotesFromBullets } from "./commands/create-notes-from-bullets";
import { createQuote, createQuoteUsingCurrentNoteAsSource } from "./commands/create-quote";
import { createMeeting } from "./commands/create-meeting";
import { showCreateTaskFlow, showCreateTaskForAnyProjectFlow } from "./commands/create-task";
import {
	setActiveTaskStatus,
	setActiveProjectStatus,
} from "./commands/set-status";
import { setActiveTaskPriority } from "./commands/set-priority";
import { touchTask } from "./commands/touch-task";
import {
	isTaskImpedeable,
	isTaskUnimpedeable,
	impedeActiveTask,
	unimpeadeActiveTask,
} from "./commands/impede-task";
import {
	openProject,
	openOutstandingProject,
	openParentProject,
} from "./commands/open-project";
import {
	openTask,
	openInProgressTask,
	openTaskFromAnyProject,
	openTaskFromAnOutstandingProject,
	openInProgressTaskFromInProgressProject,
} from "./commands/open-task";
import {
	openParentProjectJiraTicket,
	copyParentProjectJiraId,
	copyParentProjectJiraURL,
} from "./commands/jira";
import { TaskStatus, TaskPriority } from "./tasks";
import { ProjectStatus } from "./projects";
import { addTag, removeTag, toggleTag } from "./utilities";
import { isActiveFileProject } from "./utilities";
import { createFileMenuHandler } from "./events/file-menu";
import { createFilesMenuHandler } from "./events/files-menu";

interface ConductorSettings {
	jiraBaseUrl?: string;
}

const DEFAULT_SETTINGS: ConductorSettings = {
	jiraBaseUrl: "https://jira.syncsort.com",
};

export default class ConductorObsidian extends Plugin {
	settings: ConductorSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "open-project",
			name: "Open Project",
			callback: () => openProject(this.app),
		});

		this.addCommand({
			id: "open-outstanding-project",
			name: "Open an Outstanding Project",
			callback: () => openOutstandingProject(this.app),
		});

		this.addCommand({
			id: "open-task",
			name: "Open Task",
			callback: () => openTask(this.app),
		});

		this.addCommand({
			id: "open-in-progress-task",
			name: "Open an In Progress Task",
			callback: () => openInProgressTask(this.app),
		});

		this.addCommand({
			id: "open-task-from-any-project",
			name: "Open Task From Any Project",
			callback: () => openTaskFromAnyProject(this.app),
		});

		this.addCommand({
			id: "open-task-from-an-outstanding-project",
			name: "Open Task From an Outstanding Project",
			callback: () => openTaskFromAnOutstandingProject(this.app),
		});

		this.addCommand({
			id: "open-in-progress-task-from-an-in-progress-project",
			name: "Open In Progress Task From an In Progress Project",
			callback: () => openInProgressTaskFromInProgressProject(this.app),
		});

		this.addCommand({
			id: "open-parent",
			name: "Open Parent Project",
			callback: () => openParentProject(this.app),
		});

		this.addCommand({
			id: "create-new-task",
			name: "Create New Task",
			callback: () => void showCreateTaskFlow(this.app),
		});

		this.addCommand({
			id: "create-new-task-for-any-project",
			name: "Create New Task For Any Project",
			callback: () => void showCreateTaskForAnyProjectFlow(this.app),
		});

		this.addCommand({
			id: "set-task-to-todo",
			name: "Set Task Status to '⭕ 01 - To Do'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.ToDo),
		});

		this.addCommand({
			id: "set-task-to-in-progress",
			name: "Set Task Status to '🔄 02 - In Progress'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.InProgress),
		});

		this.addCommand({
			id: "set-task-to-doing",
			name: "Set Task Status to '🔄 02 - Doing'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.InProgress),
		});

		this.addCommand({
			id: "set-task-to-done",
			name: "Set Task Status to '✅ 03 - Done'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.Done),
		});

		this.addCommand({
			id: "set-task-to-abandoned",
			name: "Set Task Status to '❌ 04 - Abandoned'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.Abandoned),
		});

		this.addCommand({
			id: "set-task-to-wont-do",
			name: "Set Task Status to '🙅🏼‍♂️ 05 - Won't Do'",
			callback: () => setActiveTaskStatus(this.app, TaskStatus.WontDo),
		});

		this.addCommand({
			id: "set-project-to-todo",
			name: "Set Project Status to '⭕ 01 - To Do'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.ToDo);
				}
				return true;
			},
		});

		this.addCommand({
			id: "set-project-to-in-progress",
			name: "Set Project Status to '🔄 02 - In Progress'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.InProgress);
				}
				return true;
			},
		});

		this.addCommand({
			id: "set-project-to-doing",
			name: "Set Project Status to '🔄 02 - Doing'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.InProgress);
				}
				return true;
			},
		});

		this.addCommand({
			id: "set-project-to-done",
			name: "Set Project Status to '✅ 03 - Done'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.Done);
				}
				return true;
			},
		});

		this.addCommand({
			id: "set-project-to-abandoned",
			name: "Set Project Status to '❌ 04 - Abandoned'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.Abandoned);
				}
				return true;
			},
		});

		this.addCommand({
			id: "set-project-to-wont-do",
			name: "Set Project Status to '🙅🏼‍♂️ 05 - Won't Do'",
			checkCallback: (checking: boolean) => {
				if (!isActiveFileProject(this.app)) return false;
				if (!checking) {
					setActiveProjectStatus(this.app, ProjectStatus.WontDo);
				}
				return true;
			},
		});

		this.addCommand({
			id: "impede-task",
			name: "Impede Task",
			checkCallback: (checking: boolean) => {
				if (!isTaskImpedeable(this.app)) return false;
				if (!checking) {
					void impedeActiveTask(this.app);
				}
				return true;
			},
		});

		this.addCommand({
			id: "unimpede-task",
			name: "Unimpede Task",
			checkCallback: (checking: boolean) => {
				if (!isTaskUnimpedeable(this.app)) return false;
				if (!checking) {
					void unimpeadeActiveTask(this.app);
				}
				return true;
			},
		});

		this.addCommand({
			id: "create-tasks-from-checkboxes",
			name: "Create Tasks from Checkboxes",
			callback: () => void createNewTasksFromCheckboxes(this.app),
		});

		this.addCommand({
			id: "create-notes-from-bullets",
			name: "Create Notes from Bullets",
			callback: () => void createNewNotesFromBullets(this.app),
		});

		this.addCommand({
			id: "set-task-to-high-priority",
			name: "Set Task Priority to '🔴 01 - High'",
			callback: () => setActiveTaskPriority(this.app, TaskPriority.High),
		});

		this.addCommand({
			id: "set-task-to-medium-priority",
			name: "Set Task Priority to '🟡 02 - Medium'",
			callback: () => setActiveTaskPriority(this.app, TaskPriority.Medium),
		});

		this.addCommand({
			id: "set-task-to-low-priority",
			name: "Set Task Priority to '🟢 03 - Low'",
			callback: () => setActiveTaskPriority(this.app, TaskPriority.Low),
		});

		this.addCommand({
			id: "add-inbox-tag",
			name: "Add #inbox Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) addTag(this.app, file, "inbox");
			},
		});

		this.addCommand({
			id: "remove-inbox-tag",
			name: "Remove #inbox Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) removeTag(this.app, file, "inbox");
			},
		});

		this.addCommand({
			id: "toggle-inbox-tag",
			name: "Toggle #inbox Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) toggleTag(this.app, file, "inbox");
			},
		});

		this.addCommand({
			id: "add-reflected-tag",
			name: "Add #reflected Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) addTag(this.app, file, "reflected");
			},
		});

		this.addCommand({
			id: "remove-reflected-tag",
			name: "Remove #reflected Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) removeTag(this.app, file, "reflected");
			},
		});

		this.addCommand({
			id: "toggle-reflected-tag",
			name: "Toggle #reflected Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) toggleTag(this.app, file, "reflected");
			},
		});

		this.addCommand({
			id: "open-parent-project-jira-ticket",
			name: "Open Parent Project's Jira Ticket",
			callback: () => openParentProjectJiraTicket(this.app, this.settings.jiraBaseUrl),
		});

		this.addCommand({
			id: "add-review-tag",
			name: "Add #review Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) addTag(this.app, file, "review");
			},
		});

		this.addCommand({
			id: "remove-review-tag",
			name: "Remove #review Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) removeTag(this.app, file, "review");
			},
		});

		this.addCommand({
			id: "toggle-review-tag",
			name: "Toggle #review Tag",
			callback: () => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) toggleTag(this.app, file, "review");
			},
		});

		this.addCommand({
			id: "open-parent-project-jira-ticket",
			name: "Open Parent Project's Jira Ticket",
			callback: () => openParentProjectJiraTicket(this.app, this.settings.jiraBaseUrl),
		});

		this.addCommand({
			id: "copy-parent-project-jira-id",
			name: "Copy Parent Project's Jira ID",
			callback: () => copyParentProjectJiraId(this.app),
		});

		this.addCommand({
			id: "copy-parent-project-jira-url",
			name: "Copy Parent Project's Jira URL",
			callback: () => copyParentProjectJiraURL(this.app, this.settings.jiraBaseUrl),
		});

		this.addCommand({
			id: "create-quote",
			name: "Create Quote",
			callback: () => void createQuote(this.app),
		});

		this.addCommand({
			id: "create-quote-using-current-note-as-source",
			name: "Create Quote Using Current Note as Source",
			callback: () => void createQuoteUsingCurrentNoteAsSource(this.app),
		});

		this.addCommand({
			id: "create-meeting",
			name: "Create Meeting",
			callback: () => void createMeeting(this.app),
		});

		this.addCommand({
			id: "touch-task",
			name: "Touch Task",
			callback: () => void touchTask(this.app),
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", createFileMenuHandler(this.app)),
		);

		this.registerEvent(
			this.app.workspace.on(
				"files-menu" as any,
				createFilesMenuHandler(this.app) as any,
			),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
