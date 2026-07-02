import { Notice, Plugin, TFile } from "obsidian";

import {
	createNewTasksFromCheckboxes,
} from "./commands/create-tasks-from-checkboxes";
import { createNewNotesFromBullets } from "./commands/create-notes-from-bullets";
import { createQuote, createQuoteUsingCurrentNoteAsSource } from "./commands/create-quote";
import { createMeeting } from "./commands/create-meeting";
import { showCreateTaskFlow, showCreateTaskForAnyProjectFlow } from "./commands/create-task";
import {
	setActiveTaskStatus,
	setTaskStatus,
	setActiveProjectStatus,
	setProjectStatus,
} from "./commands/set-status";
import { setActiveTaskPriority, setTaskPriority, setTaskPriorityForFiles } from "./commands/set-priority";
import { touchTask, touchTaskFiles } from "./commands/touch-task";
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
import { getTask, Task, TaskStatus, TaskPriority } from "./tasks";
import { getProjectFromFile, ProjectStatus } from "./projects";
import { addTag, removeTag, toggleTag } from "./utilities";
import { isActiveFileProject } from "./utilities";

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
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile) {
					const metadata =
						this.app.metadataCache.getFileCache(file);
					const categories = metadata?.frontmatter?.categories;
					const isTask =
						categories &&
						Array.isArray(categories) &&
						categories.includes("[[Task]]");
					const isProject =
						categories &&
						Array.isArray(categories) &&
						categories.includes("[[Project]]");

					if (isTask) {
						const task = getTask(this.app, file.path);

						menu.addItem((item) => {
							item.setTitle("Set Status");
							const submenu = (item as any).setSubmenu();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("⭕ - To Do");
								if (task && task.status === TaskStatus.ToDo) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskStatus(
										this.app,
										file,
										TaskStatus.ToDo,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🔄 - In Progress");
								if (
									task &&
									task.status === TaskStatus.InProgress
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskStatus(
										this.app,
										file,
										TaskStatus.InProgress,
									);
								});
							});
							submenu.addSeparator();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("✅ - Done");
								if (
									task &&
									task.status === TaskStatus.Done
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskStatus(
										this.app,
										file,
										TaskStatus.Done,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("❌ - Abandoned");
								if (
									task &&
									task.status === TaskStatus.Abandoned
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskStatus(
										this.app,
										file,
										TaskStatus.Abandoned,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🙅🏼‍♂️ - Won't Do");
								if (
									task &&
									task.status === TaskStatus.WontDo
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskStatus(
										this.app,
										file,
										TaskStatus.WontDo,
									);
								});
							});
						});

						menu.addItem((item) => {
							item.setTitle("Set Priority");
							const submenu = (item as any).setSubmenu();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🔴 - High");
								if (
									task &&
									task.priority === TaskPriority.High
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskPriority(
										this.app,
										file,
										TaskPriority.High,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🟡 - Medium");
								if (
									task &&
									task.priority === TaskPriority.Medium
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskPriority(
										this.app,
										file,
										TaskPriority.Medium,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🟢 - Low");
								if (
									task &&
									task.priority === TaskPriority.Low
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setTaskPriority(
										this.app,
										file,
										TaskPriority.Low,
									);
								});
							});
						});

						menu.addItem((item) => {
							item.setTitle("Touch Task");
							item.onClick(() => {
								void touchTaskFiles(this.app, [file]);
							});
						});
					}

					if (isProject) {
						const project = getProjectFromFile(
							this.app,
							file,
						);

						menu.addItem((item) => {
							item.setTitle("Set Status");
							const submenu = (item as any).setSubmenu();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("⭕ - To Do");
								if (
									project &&
									project.status === ProjectStatus.ToDo
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setProjectStatus(
										this.app,
										file,
										ProjectStatus.ToDo,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🔄 - In Progress");
								if (
									project &&
									project.status ===
										ProjectStatus.InProgress
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setProjectStatus(
										this.app,
										file,
										ProjectStatus.InProgress,
									);
								});
							});
							submenu.addSeparator();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("✅ - Done");
								if (
									project &&
									project.status === ProjectStatus.Done
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setProjectStatus(
										this.app,
										file,
										ProjectStatus.Done,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("❌ - Abandoned");
								if (
									project &&
									project.status ===
										ProjectStatus.Abandoned
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									setProjectStatus(
										this.app,
										file,
										ProjectStatus.Abandoned,
									);
								});
							});
						});
					}

					const isJournal =
						categories &&
						Array.isArray(categories) &&
						categories.includes("[[Journal]]");

					if (isJournal) {
						menu.addItem((item) => {
							item.setTitle("Add '#reflected' Tag");
							item.onClick(() => {
								addTag(this.app, file, "reflected");
							});
						});
					}

					if (!file.path.startsWith("References/")) {
						menu.addItem((item) => {
							item.setTitle("Move to References");
							item.onClick(async () => {
								const refFolder =
									this.app.vault.getAbstractFileByPath(
										"References",
									);
								if (!refFolder) {
									await this.app.vault.createFolder(
										"References",
									);
								}

								let newPath = `References/${file.name}`;
								let counter = 1;
								while (
									this.app.vault.getFileByPath(newPath)
								) {
									const ext = file.extension
										? `.${file.extension}`
										: "";
									const baseName = file.basename;
									newPath = `References/${baseName} ${counter}${ext}`;
									counter++;
								}

								await this.app.vault.rename(
									file,
									newPath,
								);
								new Notice(`Moved to ${newPath}`);
							});
						});
					}
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on(
				"files-menu" as any,
				(menu: any, files: any[]) => {
					const selectedFiles = (files ?? []).filter(
						(f): f is TFile => f instanceof TFile,
					);
					if (selectedFiles.length === 0) return;

					const selectedTaskFiles = selectedFiles.filter(
						(file) => {
							const metadata =
								this.app.metadataCache.getFileCache(file);
							const categories =
								metadata?.frontmatter?.categories;
							return (
								categories &&
								Array.isArray(categories) &&
								categories.includes("[[Task]]")
							);
						},
					);

					// Only show bulk priority for Tasks.
					if (selectedTaskFiles.length === 0) return;

					menu.addItem((item: any) => {
						item.setTitle("Set Priority");
						const submenu = (item as any).setSubmenu();

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🔴 - High");
							subItem.onClick(() => {
								void setTaskPriorityForFiles(
									this.app,
									selectedTaskFiles,
									TaskPriority.High,
								);
							});
						});

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🟡 - Medium");
							subItem.onClick(() => {
								void setTaskPriorityForFiles(
									this.app,
									selectedTaskFiles,
									TaskPriority.Medium,
								);
							});
						});

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🟢 - Low");
							subItem.onClick(() => {
								void setTaskPriorityForFiles(
									this.app,
									selectedTaskFiles,
									TaskPriority.Low,
								);
							});
						});
					});

					menu.addItem((item: any) => {
						item.setTitle("Touch Task");
						item.onClick(() => {
							void touchTaskFiles(
								this.app,
								selectedTaskFiles,
							);
						});
					});
				},
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
