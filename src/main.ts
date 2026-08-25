import { Plugin } from "obsidian";

import {
	createNewTasksFromCheckboxes,
} from "./commands/create-tasks-from-checkboxes";
import { createNewNotesFromBullets } from "./commands/create-notes-from-bullets";
import { createQuote, createQuoteUsingCurrentNoteAsSource } from "./commands/create-quote";
import { createMeeting } from "./commands/create-meeting";
import {
	convertNoteToTask,
	isNoteConvertible,
} from "./commands/convert-note-to-task";
import { showCreateTaskFlow, showCreateTaskForAnyProjectFlow } from "./commands/create-task";
import {
	setActiveTaskStatus,
	setActiveProjectStatus,
} from "./commands/set-status";
import { setActiveTaskPriority } from "./commands/set-priority";
import { touchTask } from "./commands/touch-task";
import { insertTaskLinks } from "./commands/insert-task-links";
import { insertLinkByTopic } from "./commands/insert-link-by-topic";
import { createJournalNoteForExperiment } from "./commands/create-journal-note-for-experiment";
import { openNoteByTopic } from "./commands/open-note-by-topic";
import { insertLinkByCategory } from "./commands/insert-link-by-category";
import { openNoteByCategory } from "./commands/open-link-by-category";
import { addRun } from "./commands/add-run";
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
import {
	addTag,
	removeTag,
	toggleTag,
	isActiveFileProject,
} from "./utilities";
import { createFileMenuHandler } from "./events/file-menu";
import { createFilesMenuHandler } from "./events/files-menu";
import { registerTaskLinkStrikethrough } from "./events/strikethrough-task-links";

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

		this.addCheckedCommand(
			"set-project-to-todo",
			"Set Project Status to '⭕ 01 - To Do'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.ToDo),
		);

		this.addCheckedCommand(
			"set-project-to-in-progress",
			"Set Project Status to '🔄 02 - In Progress'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.InProgress),
		);

		this.addCheckedCommand(
			"set-project-to-doing",
			"Set Project Status to '🔄 02 - Doing'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.InProgress),
		);

		this.addCheckedCommand(
			"set-project-to-done",
			"Set Project Status to '✅ 03 - Done'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.Done),
		);

		this.addCheckedCommand(
			"set-project-to-abandoned",
			"Set Project Status to '❌ 04 - Abandoned'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.Abandoned),
		);

		this.addCheckedCommand(
			"set-project-to-wont-do",
			"Set Project Status to '🙅🏼‍♂️ 05 - Won't Do'",
			() => isActiveFileProject(this.app),
			() => setActiveProjectStatus(this.app, ProjectStatus.WontDo),
		);

		this.addCheckedCommand(
			"impede-task",
			"Impede Task",
			() => isTaskImpedeable(this.app),
			() => void impedeActiveTask(this.app),
		);

		this.addCheckedCommand(
			"unimpede-task",
			"Unimpede Task",
			() => isTaskUnimpedeable(this.app),
			() => void unimpeadeActiveTask(this.app),
		);

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

		for (const tagName of ["inbox", "reflected", "review"]) {
			this.addActiveFileTagCommands(tagName);
		}

		this.addCommand({
			id: "open-parent-project-jira-ticket",
			name: "Open Parent Project's Jira Ticket",
			callback: () =>
				openParentProjectJiraTicket(this.app, this.settings.jiraBaseUrl),
		});

		this.addCommand({
			id: "copy-parent-project-jira-id",
			name: "Copy Parent Project's Jira ID",
			callback: () => copyParentProjectJiraId(this.app),
		});

		this.addCommand({
			id: "copy-parent-project-jira-url",
			name: "Copy Parent Project's Jira URL",
			callback: () =>
				copyParentProjectJiraURL(this.app, this.settings.jiraBaseUrl),
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
			id: "add-run",
			name: "Add Run",
			callback: () => void addRun(this.app),
		});

		this.addCheckedCommand(
			"convert-note-to-task",
			"Convert Note to Task",
			() => {
				const file = this.app.workspace.activeEditor?.file;
				return Boolean(file && isNoteConvertible(this.app, file));
			},
			() => {
				const file = this.app.workspace.activeEditor?.file;
				if (file) void convertNoteToTask(this.app, file);
			},
		);

		this.addCommand({
			id: "touch-task",
			name: "Touch Task",
			callback: () => void touchTask(this.app),
		});

		this.addCommand({
			id: "insert-task-links",
			name: "Insert Task Links",
			callback: () => void insertTaskLinks(this.app),
		});

		this.addCommand({
			id: "insert-link-by-topic",
			name: "Insert Link by Topic",
			callback: () => insertLinkByTopic(this.app),
		});

		this.addCommand({
			id: "create-journal-note-for-experiment",
			name: "Create Journal Note for Experiment",
			callback: () => void createJournalNoteForExperiment(this.app),
		});

		this.addCommand({
			id: "open-note-by-topic",
			name: "Open Note by Topic",
			callback: () => openNoteByTopic(this.app),
		});

		this.addCommand({
			id: "insert-link-by-category",
			name: "Insert Link by Category",
			callback: () => void insertLinkByCategory(this.app),
		});

		this.addCommand({
			id: "open-note-by-category",
			name: "Open Note by Category",
			callback: () => void openNoteByCategory(this.app),
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

		registerTaskLinkStrikethrough(this);
	}

	private addCheckedCommand(
		id: string,
		name: string,
		check: () => boolean,
		run: () => void,
	): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking: boolean) => {
				if (!check()) return false;
				if (!checking) run();
				return true;
			},
		});
	}

	private addActiveFileTagCommands(tagName: string): void {
		const verbs = [
			{ verb: "add", apply: addTag },
			{ verb: "remove", apply: removeTag },
			{ verb: "toggle", apply: toggleTag },
		] as const;

		for (const { verb, apply } of verbs) {
			const Verb = verb.charAt(0).toUpperCase() + verb.slice(1);
			this.addCommand({
				id: `${verb}-${tagName}-tag`,
				name: `${Verb} #${tagName} Tag`,
				callback: () => {
					const file = this.app.workspace.activeEditor?.file;
					if (file) apply(this.app, file, tagName);
				},
			});
		}
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
