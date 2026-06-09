import { Notice, Plugin, TFile, MarkdownView, moment } from "obsidian";

import { ChooseProjectModal } from "src/choose-project-modal";
import { TextInputKeybinding, TextInputModal } from "src/text-input-modal";
import { LongTextInputModal } from "src/long-text-input-modal";
import {
	createNewTask,
	getTasks,
	getTask,
	Task,
	TaskStatus,
	getActiveTask,
	updateTask,
	TaskPriority,
	TaskFilters,
	TaskType,
	outstandingTaskTypes,
	closedTaskTypes,
} from "./tasks";
import {
	getProjects,
	getProjectFromFile,
	getActiveProject,
	getActiveProjectJiraId,
	outstandingProjectTypes,
	Project,
	ProjectFilters,
	ProjectStatus,
	updateProject,
} from "./projects";
import { ChooseTaskModal } from "./choose-task.modal";
import {
	ChooseMeetingTypeModal,
	MeetingType,
} from "./choose-meeting-type-modal";
import { createNewTasksFromCheckboxes } from "../commands/create-tasks-from-checkboxes";
import {
	addTag,
	removeTag,
	toggleTag,
	createFileFromTemplate,
} from "./utilities";

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
			callback: this.openProject,
		});

		this.addCommand({
			id: "open-outstanding-project",
			name: "Open an Outstanding Project",
			callback: this.openOutstandingProject,
		});

		this.addCommand({
			id: "open-task",
			name: "Open Task",
			callback: this.openTask,
		});

		this.addCommand({
			id: "open-in-progress-task",
			name: "Open an In Progress Task",
			callback: this.openInProgressTask,
		});

		this.addCommand({
			id: "open-task-from-any-project",
			name: "Open Task From Any Project",
			callback: this.openTaskFromAnyProject,
		});

		this.addCommand({
			id: "open-task-from-an-outstanding-project",
			name: "Open Task From an Outstanding Project",
			callback: this.openTaskFromAnOutstandingProject,
		});

		this.addCommand({
			id: "open-in-progress-task-from-an-in-progress-project",
			name: "Open In Progress Task From an In Progress Project",
			callback: this.openInProgressTaskFromInProgressProject,
		});

		this.addCommand({
			id: "open-parent",
			name: "Open Parent Project",
			callback: this.openParentProject,
		});

		this.addCommand({
			id: "create-new-task",
			name: "Create New Task",
			callback: this.createNewTask,
		});

		this.addCommand({
			id: "create-new-task-for-any-project",
			name: "Create New Task For Any Project",
			callback: this.createNewTaskForAnyProject,
		});

		this.addCommand({
			id: "set-task-to-todo",
			name: "Set Task Status to '⭕ 01 - To Do'",
			callback: () => this.setActiveTaskStatus(TaskStatus.ToDo),
		});

		this.addCommand({
			id: "set-task-to-in-progress",
			name: "Set Task Status to '🔄 02 - In Progress'",
			callback: () => this.setActiveTaskStatus(TaskStatus.InProgress),
		});

		this.addCommand({
			id: "set-task-to-doing",
			name: "Set Task Status to '🔄 02 - Doing'",
			callback: () => this.setActiveTaskStatus(TaskStatus.InProgress),
		});

		this.addCommand({
			id: "set-task-to-done",
			name: "Set Task Status to '✅ 03 - Done'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Done),
		});

		this.addCommand({
			id: "set-task-to-abandoned",
			name: "Set Task Status to '❌ 04 - Abandoned'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Abandoned),
		});

		this.addCommand({
			id: "set-task-to-wont-do",
			name: "Set Task Status to '🙅🏼‍♂️ 05 - Won't Do'",
			callback: () => this.setActiveTaskStatus(TaskStatus.WontDo),
		});

		this.addCommand({
			id: "impede-task",
			name: "Impede Task",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.activeEditor?.file;
				if (!activeFile) return false;
				const metadata =
					this.app.metadataCache.getFileCache(activeFile);
				const categories = metadata?.frontmatter?.categories;
				const isTask =
					categories &&
					Array.isArray(categories) &&
					categories.includes("[[Task]]");
				if (!isTask) return false;
				const isImpeded = metadata?.frontmatter?.impeded === true;
				if (isImpeded) return false;
				if (!checking) {
					void this.impedeActiveTask();
				}
				return true;
			},
		});

		this.addCommand({
			id: "unimpede-task",
			name: "Unimpede Task",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.activeEditor?.file;
				if (!activeFile) return false;
				const metadata =
					this.app.metadataCache.getFileCache(activeFile);
				const categories = metadata?.frontmatter?.categories;
				const isTask =
					categories &&
					Array.isArray(categories) &&
					categories.includes("[[Task]]");
				if (!isTask) return false;
				const isImpeded = metadata?.frontmatter?.impeded === true;
				if (!isImpeded) return false;
				if (!checking) {
					void this.unimpedeActiveTask();
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
			id: "set-task-to-high-priority",
			name: "Set Task Priority to '🔴 01 - High'",
			callback: () => this.setActiveTaskPriority(TaskPriority.High),
		});

		this.addCommand({
			id: "set-task-to-medium-priority",
			name: "Set Task Priority to '🟡 02 - Medium'",
			callback: () => this.setActiveTaskPriority(TaskPriority.Medium),
		});

		this.addCommand({
			id: "set-task-to-low-priority",
			name: "Set Task Priority to '🟢 03 - Low'",
			callback: () => this.setActiveTaskPriority(TaskPriority.Low),
		});

		this.addCommand({
			id: "add-inbox-tag",
			name: "Add #inbox Tag",
			callback: () => this.addTagToActiveFile("inbox"),
		});

		this.addCommand({
			id: "remove-inbox-tag",
			name: "Remove #inbox Tag",
			callback: () => this.removeTagFromActiveFile("inbox"),
		});

		this.addCommand({
			id: "toggle-inbox-tag",
			name: "Toggle #inbox Tag",
			callback: () => this.toggleTagOnActiveFile("inbox"),
		});

		this.addCommand({
			id: "add-reflected-tag",
			name: "Add #reflected Tag",
			callback: () => this.addTagToActiveFile("reflected"),
		});

		this.addCommand({
			id: "remove-reflected-tag",
			name: "Remove #reflected Tag",
			callback: () => this.removeTagFromActiveFile("reflected"),
		});

		this.addCommand({
			id: "toggle-reflected-tag",
			name: "Toggle #reflected Tag",
			callback: () => this.toggleTagOnActiveFile("reflected"),
		});

		this.addCommand({
			id: "open-parent-project-jira-ticket",
			name: "Open Parent Project's Jira Ticket",
			callback: () => this.openParentProjectJiraTicket(),
		});

		this.addCommand({
			id: "add-review-tag",
			name: "Add #review Tag",
			callback: () => this.addTagToActiveFile("review"),
		});

		this.addCommand({
			id: "remove-review-tag",
			name: "Remove #review Tag",
			callback: () => this.removeTagFromActiveFile("review"),
		});

		this.addCommand({
			id: "toggle-review-tag",
			name: "Toggle #review Tag",
			callback: () => this.toggleTagOnActiveFile("review"),
		});

		this.addCommand({
			id: "open-parent-project-jira-ticket",
			name: "Open Parent Project's Jira Ticket",
			callback: () => this.openParentProjectJiraTicket(),
		});

		this.addCommand({
			id: "copy-parent-project-jira-id",
			name: "Copy Parent Project's Jira ID",
			callback: () => this.copyParentProjectJiraId(),
		});

		this.addCommand({
			id: "copy-parent-project-jira-url",
			name: "Copy Parent Project's Jira URL",
			callback: () => this.copyParentProjectJiraURL(),
		});

		this.addCommand({
			id: "create-quote",
			name: "Create Quote",
			callback: this.createQuote,
		});

		this.addCommand({
			id: "create-quote-using-current-note-as-source",
			name: "Create Quote Using Current Note as Source",
			callback: this.createQuoteUsingCurrentNoteAsSource,
		});

		this.addCommand({
			id: "create-meeting",
			name: "Create Meeting",
			callback: this.createMeeting,
		});

		this.addCommand({
			id: "touch-task",
			name: "Touch Task",
			callback: this.touchTask,
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile) {
					const metadata = this.app.metadataCache.getFileCache(file);
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
									this.setTaskStatus(file, TaskStatus.ToDo);
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
									this.setTaskStatus(
										file,
										TaskStatus.InProgress,
									);
								});
							});
							submenu.addSeparator();
							submenu.addItem((subItem: any) => {
								subItem.setTitle("✅ - Done");
								if (task && task.status === TaskStatus.Done) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									this.setTaskStatus(file, TaskStatus.Done);
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
									this.setTaskStatus(
										file,
										TaskStatus.Abandoned,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🙅🏼‍♂️ - Won't Do");
								if (task && task.status === TaskStatus.WontDo) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									this.setTaskStatus(file, TaskStatus.WontDo);
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
									this.setTaskPriority(
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
									this.setTaskPriority(
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
									this.setTaskPriority(
										file,
										TaskPriority.Low,
									);
								});
							});
						});

						menu.addItem((item) => {
							item.setTitle("Touch Task");
							item.onClick(() => {
								void this.touchTaskFiles([file]);
							});
						});
					}

					if (isProject) {
						const project = getProjectFromFile(this.app, file);

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
									this.setProjectStatus(
										file,
										ProjectStatus.ToDo,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("🔄 - In Progress");
								if (
									project &&
									project.status === ProjectStatus.InProgress
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									this.setProjectStatus(
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
									this.setProjectStatus(
										file,
										ProjectStatus.Done,
									);
								});
							});
							submenu.addItem((subItem: any) => {
								subItem.setTitle("❌ - Abandoned");
								if (
									project &&
									project.status === ProjectStatus.Abandoned
								) {
									subItem.setChecked(true);
								}
								subItem.onClick(() => {
									this.setProjectStatus(
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

					const selectedTaskFiles = selectedFiles.filter((file) => {
						const metadata =
							this.app.metadataCache.getFileCache(file);
						const categories = metadata?.frontmatter?.categories;
						return (
							categories &&
							Array.isArray(categories) &&
							categories.includes("[[Task]]")
						);
					});

					// Only show bulk priority for Tasks.
					if (selectedTaskFiles.length === 0) return;

					menu.addItem((item: any) => {
						item.setTitle("Set Priority");
						const submenu = (item as any).setSubmenu();

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🔴 - High");
							subItem.onClick(() => {
								void this.setTaskPriorityForFiles(
									selectedTaskFiles,
									TaskPriority.High,
								);
							});
						});

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🟡 - Medium");
							subItem.onClick(() => {
								void this.setTaskPriorityForFiles(
									selectedTaskFiles,
									TaskPriority.Medium,
								);
							});
						});

						submenu.addItem((subItem: any) => {
							subItem.setTitle("🟢 - Low");
							subItem.onClick(() => {
								void this.setTaskPriorityForFiles(
									selectedTaskFiles,
									TaskPriority.Low,
								);
							});
						});
					});

					menu.addItem((item: any) => {
						item.setTitle("Touch Task");
						item.onClick(() => {
							void this.touchTaskFiles(selectedTaskFiles);
						});
					});
				},
			),
		);
	}

	private async touchTaskFiles(files: TFile[]): Promise<void> {
		const touchedDt = moment().format("YYYY-MM-DDTHH:mm:ss");
		let updatedCount = 0;
		let lastUpdatedTaskName: string | null = null;

		for (const file of files) {
			const task = getTask(this.app, file.path);
			if (!task) continue;

			await this.app.fileManager.processFrontMatter(file, (fm) => {
				fm["meta-last-priority-change-dt"] = touchedDt;
				fm["meta-last-status-change-dt"] = touchedDt;
			});
			updatedCount++;
			lastUpdatedTaskName = task.name;
		}

		if (updatedCount === 0) return;
		if (updatedCount === 1 && lastUpdatedTaskName) {
			new Notice(`Task [${lastUpdatedTaskName}] touched...`);
		} else {
			new Notice(`Touched ${updatedCount} tasks`);
		}
	}

	private async setTaskPriorityForFiles(
		files: TFile[],
		priority: TaskPriority,
	): Promise<void> {
		const priorityChangeDt = moment().format("YYYY-MM-DDTHH:mm:ss");
		let updatedCount = 0;
		let lastUpdatedTaskName: string | null = null;

		for (const file of files) {
			const task = getTask(this.app, file.path);
			if (!task) continue;
			let didChange = false;
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				if (fm["priority"] !== priority) {
					fm["priority"] = priority;
					fm["meta-last-priority-change-dt"] = priorityChangeDt;
					didChange = true;
				}
			});
			if (!didChange) continue;

			updatedCount++;
			lastUpdatedTaskName = task.name;
		}

		if (updatedCount === 0) return;

		if (updatedCount === 1 && lastUpdatedTaskName) {
			new Notice(
				`Task [${lastUpdatedTaskName}] set to [${this.getPriorityDisplay(priority)}]...`,
			);
		} else {
			new Notice(
				`Priority set to ${this.getPriorityDisplay(priority)} for ${updatedCount} tasks`,
			);
		}
	}

	openProject = () => {
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = getProjects(this.app);
		selectProjectModal.onChoose = (project: Project) => {
			this.app.workspace.getLeaf(false).openFile(project.file);
		};
		selectProjectModal.open();
	};

	openOutstandingProject = () => {
		const selectProjectModal = new ChooseProjectModal(this.app);
		const filter: ProjectFilters = {
			statusFilter: {
				statusIs: [ProjectStatus.ToDo, ProjectStatus.InProgress],
			},
			ongoingFilter: {
				ongoingIs: false,
			},
		};
		selectProjectModal.projects = getProjects(this.app, filter);
		selectProjectModal.onChoose = (project: Project) => {
			this.app.workspace.getLeaf(false).openFile(project.file);
		};
		selectProjectModal.open();
	};

	openTask = () => {
		const selectTaskModal = new ChooseTaskModal(this.app, {
			initialGroupMode: "status",
		});
		const activeProject = getActiveProject(this.app);
		let filters: TaskFilters = {
			projectFilter: undefined,
		};
		if (activeProject) {
			filters.projectFilter = {
				projectIs: [activeProject.name],
			};
		}
		selectTaskModal.tasks = getTasks(this.app, filters);
		selectTaskModal.onChoose = (task: Task) => {
			this.app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	};

	openInProgressTask = () => {
		const selectTaskModal = new ChooseTaskModal(this.app);
		const filters: TaskFilters = {
			statusFilter: {
				statusIs: [TaskStatus.InProgress],
			},
			typeFilter: {
				typeExcludes: [TaskType.BlogPost],
			},
			impededFilter: {
				impededIs: false,
			},
		};
		selectTaskModal.tasks = getTasks(this.app, filters);
		selectTaskModal.onChoose = (task: Task) => {
			this.app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	};

	openTaskFromAnyProject = () => {
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = getProjects(this.app);
		selectProjectModal.onChoose = (project: Project) => {
			const selectTaskModal = new ChooseTaskModal(this.app);
			const filters: TaskFilters = {
				projectFilter: {
					projectIs: [project.name],
				},
			};
			selectTaskModal.tasks = getTasks(this.app, filters);
			selectTaskModal.onChoose = (task: Task) => {
				this.app.workspace.getLeaf(false).openFile(task.file);
			};
			selectTaskModal.open();
		};
		selectProjectModal.open();
	};

	openTaskFromAnOutstandingProject = () => {
		// Obtain a list of outstanding projects
		const projectFilter: ProjectFilters = {
			statusFilter: {
				statusIs: outstandingProjectTypes,
			},
			ongoingFilter: {
				ongoingIs: false,
			},
		};
		const outstandingProjects = getProjects(this.app, projectFilter);

		// Obtain a list of tasks that belong to those projects. The status should be either To Do or In Progress
		const selectTaskModal = new ChooseTaskModal(this.app);
		const taskFilters: TaskFilters = {
			projectFilter: {
				projectIs: outstandingProjects.map((p) => p.name),
			},
			statusFilter: {
				statusIs: outstandingTaskTypes,
			},
		};

		// List those tasks
		selectTaskModal.tasks = getTasks(this.app, taskFilters);

		// Open the selected task
		selectTaskModal.onChoose = (task: Task) => {
			this.app.workspace.getLeaf(false).openFile(task.file);
		};
		selectTaskModal.open();
	};

	openInProgressTaskFromInProgressProject = () => {
		// Obtain a list of in progress
		const projectFilter: ProjectFilters = {
			statusFilter: {
				statusIs: [ProjectStatus.InProgress],
			},
			ongoingFilter: {
				ongoingIs: false,
			},
		};
		const inProgressProjects = getProjects(this.app, projectFilter);

		// Obtain a list of tasks that belong to those projects. The status should be In Progress
		const selectTaskModal = new ChooseTaskModal(this.app, {
			initialGroupMode: "priority",
		});
		const taskFilters: TaskFilters = {
			projectFilter: {
				projectIs: inProgressProjects.map((p) => p.name),
			},
			statusFilter: {
				statusIs: [TaskStatus.InProgress],
			},
		};

		// List those tasks
		const tasks = getTasks(this.app, taskFilters);

		if (tasks.length === 1 && tasks[0]?.file) {
			this.app.workspace.getLeaf(false).openFile(tasks[0].file);
		} else {
			selectTaskModal.tasks = getTasks(this.app, taskFilters);

			// Open the selected task
			selectTaskModal.onChoose = (task: Task) => {
				this.app.workspace.getLeaf(false).openFile(task.file);
			};
			selectTaskModal.open();
		}
	};

	openParentProject = () => {
		const activeProject = getActiveProject(this.app);
		if (activeProject) {
			this.app.workspace.getLeaf(false).openFile(activeProject.file);
		}
	};

	createNewTask = () => {
		// See if the focussed file is a project. If it is, use that as the chosen project.
		const activeProject = getActiveProject(this.app);

		if (activeProject) {
			this.displayTaskNameInput(activeProject);
		} else {
			// Obtain a list of possible projects
			const projects = getProjects(this.app);

			// Display a modal to obtain the chosen project
			const selectProjectModal = new ChooseProjectModal(this.app);
			selectProjectModal.projects = projects;

			selectProjectModal.onChoose = this.displayTaskNameInput;
			selectProjectModal.open();
		}
	};

	createNewTaskForAnyProject = () => {
		// Obtain a list of possible projects
		const projects = getProjects(this.app);

		// Display a modal to obtain the chosen project
		const selectProjectModal = new ChooseProjectModal(this.app);
		selectProjectModal.projects = projects;

		selectProjectModal.onChoose = this.displayTaskNameInput;
		selectProjectModal.open();
	};

	setActiveTaskStatus = (status: TaskStatus) => {
		const activeTask = getActiveTask(this.app);
		if (!activeTask) return;
		void this.setTaskStatusForFiles([activeTask.file], status, {
			openParentProjectIfTaskClosed: true,
		});
	};

	getPriorityDisplay = (priority: TaskPriority): string => {
		switch (priority) {
			case TaskPriority.High:
				return "🔴 - High";
			case TaskPriority.Medium:
				return "🟡 - Medium";
			case TaskPriority.Low:
				return "🟢 - Low";
			default:
				return priority;
		}
	};

	getStatusDisplay = (status: TaskStatus | ProjectStatus): string => {
		switch (status) {
			case TaskStatus.ToDo:
			case ProjectStatus.ToDo:
				return "⭕ - To Do";
			case TaskStatus.InProgress:
			case ProjectStatus.InProgress:
				return "🔄 - In Progress";
			case TaskStatus.Done:
			case ProjectStatus.Done:
				return "✅ - Done";
			case TaskStatus.Abandoned:
			case ProjectStatus.Abandoned:
				return "❌ - Abandoned";
			case TaskStatus.WontDo:
				return "🙅🏼‍♂️ - Won't Do";
			default:
				return status;
		}
	};

	setActiveTaskPriority = (priority: TaskPriority) => {
		const activeTask = getActiveTask(this.app);
		if (!activeTask) return;
		void this.setTaskPriorityForFiles([activeTask.file], priority);
	};

	setTaskPriority = (file: TFile, priority: TaskPriority) => {
		void this.setTaskPriorityForFiles([file], priority);
	};

	setTaskStatus = (file: TFile, status: TaskStatus) => {
		void this.setTaskStatusForFiles([file], status, {
			openParentProjectIfTaskClosed:
				this.shouldOpenParentProjectForTaskStatus(status),
		});
	};

	private shouldOpenParentProjectForTaskStatus(status: TaskStatus): boolean {
		return closedTaskTypes.includes(status);
	}

	private async setTaskStatusForFiles(
		files: TFile[],
		status: TaskStatus,
		options?: { openParentProjectIfTaskClosed?: boolean },
	): Promise<void> {
		const statusChangeDt = moment().format("YYYY-MM-DDTHH:mm:ss");
		let updatedCount = 0;
		let lastUpdatedTaskName: string | null = null;

		for (const file of files) {
			const task = getTask(this.app, file.path);
			if (!task) continue;
			const answerToSave =
				status === TaskStatus.Done &&
				task.status !== TaskStatus.Done &&
				this.isQuestionTask(task) &&
				!this.taskHasAnswer(file)
					? await this.promptForOptionalQuestionAnswer(task.name)
					: null;

			let didChange = false;
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				if (fm["status"] !== status) {
					fm["status"] = status;
					fm["meta-last-status-change-dt"] = statusChangeDt;
					didChange = true;
				}
				if (answerToSave) {
					fm["answer"] = answerToSave;
					didChange = true;
				}
			});

			if (!didChange) continue;
			updatedCount++;
			lastUpdatedTaskName = task.name;
		}

		if (updatedCount === 0) return;

		if (updatedCount === 1 && lastUpdatedTaskName) {
			new Notice(
				`Task [${lastUpdatedTaskName}] set to [${this.getStatusDisplay(status)}]...`,
			);
		} else {
			new Notice(
				`Status set to ${this.getStatusDisplay(status)} for ${updatedCount} tasks`,
			);
		}

		if (
			options?.openParentProjectIfTaskClosed &&
			this.shouldOpenParentProjectForTaskStatus(status) &&
			updatedCount > 0
		) {
			const activeProject = getActiveProject(this.app);
			if (activeProject) {
				await this.app.workspace
					.getLeaf(false)
					.openFile(activeProject.file);
			}
		}
	}

	setProjectStatus = (file: TFile, status: ProjectStatus) => {
		const project = getProjectFromFile(this.app, file);
		if (project) {
			project.status = status;
			updateProject(this.app, project);
			new Notice(
				`Project [${project.name}] set to [${this.getStatusDisplay(status)}]...`,
			);
		}
	};

	displayTaskNameInput = async (selectedProject: Project) => {
		const keybindings: TextInputKeybinding[] = [
			{
				id: "shift-enter",
				commandText: "shift+↵",
				check: (e) => e.shiftKey && e.key === "Enter",
				instruction: "create task in background",
			},
			{
				id: "enter",
				commandText: "↵",
				check: (e) => e.key === "Enter",
				instruction: "create task",
			},
		];
		const { value: name, submitKeybinding } = await TextInputModal.show(
			this.app,
			{
				title: "Task Name",
				placeholder: `Enter task name for project '${selectedProject.name}'...`,
				keybindings,
			},
		);
		const { templateName, answer } =
			await this.getTaskCreationDetails(name);
		const task = await createNewTask(
			this.app,
			name,
			selectedProject,
			templateName,
		);
		if (task) {
			await this.applyQuestionAnswerToTaskIfProvided(task.file, answer);
			new Notice(`New task [${task.name}] created...`);
			switch (submitKeybinding) {
				case "enter":
					this.app.workspace.getLeaf(false).openFile(task.file);
					break;
				case "shift-enter":
					// Don't display the file
					break;
				default:
					console.error(
						`Unknown ConfirmationKeybinding type [${submitKeybinding}]`,
					);
					break;
			}
		}
	};

	private async getTaskCreationDetails(taskName: string): Promise<{
		templateName: string;
		answer: string | null;
	}> {
		if (!this.isQuestionTaskName(taskName)) {
			return { templateName: "Task", answer: null };
		}

		const answer = await this.promptForOptionalQuestionAnswer(taskName);
		return { templateName: "Question Task", answer };
	}

	private isQuestionTaskName(taskName: string): boolean {
		return taskName.trim().endsWith("?");
	}

	private isQuestionTask(task: Task): boolean {
		return (
			(task.type ?? []).includes(TaskType.QuestionTask) ||
			this.isQuestionTaskName(task.name)
		);
	}

	private taskHasAnswer(taskFile: TFile): boolean {
		const answer =
			this.app.metadataCache.getFileCache(taskFile)?.frontmatter?.["answer"];
		return typeof answer === "string" && answer.trim().length > 0;
	}

	private async promptForOptionalQuestionAnswer(
		taskName: string,
	): Promise<string | null> {
		const { value } = await TextInputModal.show(this.app, {
			title: "Answer (Optional)",
			placeholder: `Provide an answer for '${taskName.trim()}' (or leave blank)...`,
		});
		const answer = value.trim();
		return answer.length > 0 ? answer : null;
	}

	private async applyQuestionAnswerToTaskIfProvided(
		taskFile: TFile,
		answer: string | null,
	): Promise<void> {
		if (!answer) return;

		await this.app.fileManager.processFrontMatter(taskFile, (fm) => {
			fm["answer"] = answer;
			fm["status"] = TaskStatus.Done;
		});
	}

	addTagToActiveFile(tag: string) {
		const activeFile = this.app.workspace.activeEditor?.file;
		if (activeFile) {
			addTag(this.app, activeFile, tag);
		}
	}

	removeTagFromActiveFile(tag: string) {
		const activeFile = this.app.workspace.activeEditor?.file;
		if (activeFile) {
			removeTag(this.app, activeFile, tag);
		}
	}

	toggleTagOnActiveFile(tag: string) {
		const activeFile = this.app.workspace.activeEditor?.file;
		if (activeFile) {
			toggleTag(this.app, activeFile, tag);
		}
	}

	private buildJiraUrl(jiraId: string): string {
		const baseUrl =
			this.settings.jiraBaseUrl || "https://jira.syncsort.com";
		return `${baseUrl}/browse/${jiraId}`;
	}

	openParentProjectJiraTicket() {
		const jiraId = getActiveProjectJiraId(this.app);
		if (!jiraId) return;

		const jiraUrl = this.buildJiraUrl(jiraId);
		window.open(jiraUrl, "_blank");
	}

	copyParentProjectJiraId() {
		const jiraId = getActiveProjectJiraId(this.app);
		if (!jiraId) return;

		navigator.clipboard.writeText(jiraId);
	}

	copyParentProjectJiraURL() {
		const jiraId = getActiveProjectJiraId(this.app);
		if (!jiraId) return;

		const jiraUrl = this.buildJiraUrl(jiraId);
		navigator.clipboard.writeText(jiraUrl);
	}

	createQuote = async () => {
		// Get selected text if available
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const selectedText = activeView?.editor?.getSelection() || "";

		const { value: quote } = await LongTextInputModal.show(this.app, {
			title: "Quote",
			placeholder: "Enter the quote...",
			initialValue: selectedText || undefined,
		});

		const { value: person } = await TextInputModal.show(this.app, {
			title: "Person",
			placeholder: "Who said this quote?",
		});

		const { value: about } = await TextInputModal.show(this.app, {
			title: `${person} on...`,
			placeholder: "What is this quote about?",
		});

		const { value: source } = await TextInputModal.show(this.app, {
			title: "Source",
			placeholder: "Where did you see this quote?",
		});

		const baseFileName = `${person} on ${about}`;
		let fileName = baseFileName;
		let counter = 1;

		// Create References directory if it doesn't exist
		const referencesFolder =
			this.app.vault.getAbstractFileByPath("References");
		if (!referencesFolder) {
			await this.app.vault.createFolder("References");
		}

		while (this.app.vault.getFileByPath(`References/${fileName}.md`)) {
			fileName = `${baseFileName} ${counter}`;
			counter++;
		}

		const filePath = `References/${fileName}.md`;
		const file = await createFileFromTemplate(this.app, filePath, "Quote");

		if (file) {
			let content = await this.app.vault.read(file);
			content = content.replace(/PERSON/g, `[[${person}]]`);
			content = content.replace(/WHAT IS BEING DISCUSSED/g, about);

			// The template has "> > The quote" - we need to replace the entire line
			// and ensure each line of the quote has the proper > > prefix
			const formattedQuote = quote
				.split("\n")
				.map((line) => `> > ${line}`)
				.join("\n");
			content = content.replace(/>\s*>\s*The quote/g, formattedQuote);

			content = content.replace(/SOURCE/g, source);
			await this.app.vault.modify(file, content);

			await addTag(this.app, file, "inbox");

			new Notice(`Quote note created: ${fileName}`);
			this.app.workspace.getLeaf(false).openFile(file);
		} else {
			new Notice("Failed to create quote note. Template may be missing.");
		}
	};

	createQuoteUsingCurrentNoteAsSource = async () => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) {
			new Notice("No active note to use as source.");
			return;
		}

		const currentNoteName = activeView.file.basename;
		const selectedText = activeView?.editor?.getSelection() || "";

		const { value: quote } = await LongTextInputModal.show(this.app, {
			title: "Quote",
			placeholder: "Enter the quote...",
			initialValue: selectedText || undefined,
		});

		const { value: person } = await TextInputModal.show(this.app, {
			title: "Person",
			placeholder: "Who said this quote?",
		});

		const { value: about } = await TextInputModal.show(this.app, {
			title: `${person} on...`,
			placeholder: "What is this quote about?",
		});

		const source = `[[${currentNoteName}]]`;

		const baseFileName = `${person} on ${about}`;
		let fileName = baseFileName;
		let counter = 1;

		const referencesFolder =
			this.app.vault.getAbstractFileByPath("References");
		if (!referencesFolder) {
			await this.app.vault.createFolder("References");
		}

		while (this.app.vault.getFileByPath(`References/${fileName}.md`)) {
			fileName = `${baseFileName} ${counter}`;
			counter++;
		}

		const filePath = `References/${fileName}.md`;
		const file = await createFileFromTemplate(this.app, filePath, "Quote");

		if (file) {
			let content = await this.app.vault.read(file);
			content = content.replace(/PERSON/g, `[[${person}]]`);
			content = content.replace(/WHAT IS BEING DISCUSSED/g, about);

			const formattedQuote = quote
				.split("\n")
				.map((line) => `> > ${line}`)
				.join("\n");
			content = content.replace(/>\s*>\s*The quote/g, formattedQuote);

			content = content.replace(/SOURCE/g, source);
			await this.app.vault.modify(file, content);

			await addTag(this.app, file, "inbox");

			new Notice(`Quote note created: ${fileName}`);
			this.app.workspace.getLeaf(false).openFile(file);
		} else {
			new Notice("Failed to create quote note. Template may be missing.");
		}
	};

	createMeeting = async () => {
		const meetingType = await new Promise<MeetingType | null>((resolve) => {
			const modal = new ChooseMeetingTypeModal(this.app);
			modal.onChoose = (type: MeetingType) => resolve(type);
			modal.open();
		});

		if (!meetingType) return;

		const { value: meetingName } = await TextInputModal.show(this.app, {
			title: "Name of Meeting",
			placeholder: "Enter meeting name...",
		});

		const trimmedMeetingName = meetingName.trim();
		if (!trimmedMeetingName) {
			new Notice("Meeting name cannot be blank");
			return;
		}

		const sanitizedMeetingName = trimmedMeetingName
			.replace(/[:\\/]/g, "")
			.trim();
		if (!sanitizedMeetingName) {
			new Notice("Meeting name cannot be blank");
			return;
		}

		const templateName = this.getMeetingTemplateName(meetingType);
		const fileName = this.getUniqueMeetingFileName(sanitizedMeetingName);
		const filePath = `Projects/Work/${fileName}.md`;

		const file = await createFileFromTemplate(
			this.app,
			filePath,
			templateName,
		);
		if (!file) {
			new Notice(
				"Failed to create meeting note. Template may be missing.",
			);
			return;
		}

		// Ensure the template doesn't auto-fill date-of-event.
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm["date-of-event"] = "";
		});

		this.app.workspace.getLeaf(false).openFile(file);
	};

	touchTask = async () => {
		const activeTask = getActiveTask(this.app);
		if (!activeTask) {
			new Notice("No active task found");
			return;
		}
		await this.touchTaskFiles([activeTask.file]);
	};

	private async impedeActiveTask(): Promise<void> {
		const activeTask = getActiveTask(this.app);
		if (!activeTask) return;

		const { value: reason } = await TextInputModal.show(this.app, {
			title: "Impeded Reason",
			placeholder: "Why is this task impeded?",
		});

		await this.app.fileManager.processFrontMatter(activeTask.file, (fm) => {
			fm["impeded"] = true;
			fm["impeded-reason"] = reason?.trim() ?? "";
		});

		new Notice(`Task [${activeTask.name}] impeded...`);
	}

	private async unimpedeActiveTask(): Promise<void> {
		const activeTask = getActiveTask(this.app);
		if (!activeTask) return;

		await this.app.fileManager.processFrontMatter(activeTask.file, (fm) => {
			fm["impeded"] = false;
			fm["impeded-reason"] = "";
		});

		new Notice(`Task [${activeTask.name}] unimpeded...`);
	}

	private getMeetingTemplateName(meetingType: MeetingType): string {
		switch (meetingType) {
			case "General":
				return "Meeting";
			case "Epic":
				return "Meeting - Epic";
			case "Project":
				return "Meeting - Project";
			default:
				return "Meeting";
		}
	}

	private getUniqueMeetingFileName(meetingName: string): string {
		const sanitizedName = meetingName;
		const basePath = `Projects/Work/${sanitizedName}.md`;
		if (!this.app.vault.getFileByPath(basePath)) {
			return sanitizedName;
		}

		let counter = 2;
		while (true) {
			const proposedName = `${sanitizedName} (${counter})`;
			const proposedPath = `Projects/Work/${proposedName}.md`;
			if (!this.app.vault.getFileByPath(proposedPath)) {
				return proposedName;
			}
			counter++;
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
