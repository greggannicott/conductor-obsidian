import { Notice, Plugin, TFile, MarkdownView } from "obsidian";

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
import { ChooseMeetingTypeModal, MeetingType } from "./choose-meeting-type-modal";
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
			name: "Set Task Status to '01 - To Do'",
			callback: () => this.setActiveTaskStatus(TaskStatus.ToDo),
		});

		this.addCommand({
			id: "set-task-to-in-progress",
			name: "Set Task Status to '02 - In Progress'",
			callback: () => this.setActiveTaskStatus(TaskStatus.InProgress),
		});

		this.addCommand({
			id: "set-task-to-done",
			name: "Set Task Status to '03 - Done'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Done),
		});

		this.addCommand({
			id: "set-task-to-abandoned",
			name: "Set Task Status to '04 - Abandoned'",
			callback: () => this.setActiveTaskStatus(TaskStatus.Abandoned),
		});

		this.addCommand({
			id: "create-tasks-from-checkboxes",
			name: "Create Tasks from Checkboxes",
			callback: () => this.createNewTasksFromCheckboxes(),
		});

		this.addCommand({
			id: "set-task-to-high-priority",
			name: "Set Task Priority to '01 - High'",
			callback: () => this.setActiveTaskPriority(TaskPriority.High),
		});

		this.addCommand({
			id: "set-task-to-medium-priority",
			name: "Set Task Priority to '02 - Medium'",
			callback: () => this.setActiveTaskPriority(TaskPriority.Medium),
		});

		this.addCommand({
			id: "set-task-to-low-priority",
			name: "Set Task Priority to '03 - Low'",
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
				}
			}),
		);
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
		const selectTaskModal = new ChooseTaskModal(this.app);
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
		const selectTaskModal = new ChooseTaskModal(this.app);
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

	createNewTasksFromCheckboxes = async () => {
		// Get the active editor
		const editor = this.app.workspace.activeEditor?.editor;
		if (!editor) {
			new Notice("No active editor found");
			return;
		}

		// Get selected text or current line
		let selectedText = editor.getSelection();
		let selectionRange: {
			from: { line: number; ch: number };
			to: { line: number; ch: number };
		} | null = null;

		if (!selectedText) {
			const cursor = editor.getCursor();
			selectedText = editor.getLine(cursor.line);
			selectionRange = {
				from: { line: cursor.line, ch: 0 },
				to: { line: cursor.line, ch: selectedText.length },
			};
		} else {
			selectionRange = {
				from: editor.getCursor("from"),
				to: editor.getCursor("to"),
			};
		}

		// Find all lines with unchecked checkboxes (excluding those that already contain links)
		const lines = selectedText.split("\n");
		const checkboxPattern = /^(\s*)- \[ \] (.+)$/;
		const linkPattern = /\[\[.+\]\]/;
		const bulletPattern = /^(\s*)[-*] (.+)$/;
		const checkboxLines: {
			lineIndex: number;
			indent: string;
			text: string;
			fullLine: string;
			nestedBullets: string[];
		}[] = [];

		lines.forEach((line, index) => {
			const match = line.match(checkboxPattern);
			if (match) {
				const checkboxText = match[2];
				// Skip checkboxes that already contain a link
				if (!linkPattern.test(checkboxText)) {
					checkboxLines.push({
						lineIndex: index,
						indent: match[1],
						text: checkboxText.trim(),
						fullLine: line,
						nestedBullets: [],
					});
				}
			} else if (checkboxLines.length > 0) {
				// Check if this is a nested bullet point
				const bulletMatch = line.match(bulletPattern);
				if (bulletMatch) {
					const lastCheckbox =
						checkboxLines[checkboxLines.length - 1];
					const bulletIndent = bulletMatch[1];
					// If this bullet is indented more than the last checkbox, it's nested
					if (bulletIndent.length > lastCheckbox.indent.length) {
						lastCheckbox.nestedBullets.push(line);
					}
				}
			}
		});

		// Check if any unchecked checkboxes were found
		if (checkboxLines.length === 0) {
			new Notice("No unchecked checkboxes found");
			return;
		}

		// Get or prompt for active project
		let selectedProject = getActiveProject(this.app);

		if (!selectedProject) {
			// Prompt user to select a project
			const projects = getProjects(this.app);
			selectedProject = await new Promise<Project | null>((resolve) => {
				const selectProjectModal = new ChooseProjectModal(this.app);
				selectProjectModal.projects = projects;
				selectProjectModal.onChoose = (project: Project) => {
					resolve(project);
				};
				selectProjectModal.open();
			});

			if (!selectedProject) {
				new Notice("No project selected");
				return;
			}
		}

		// Create tasks for each checkbox
		let createdCount = 0;
		const replacements: { lineIndex: number; newLine: string }[] = [];

		for (const checkboxLine of checkboxLines) {
			const task = await createNewTask(
				this.app,
				checkboxLine.text,
				selectedProject,
			);
			if (task) {
				createdCount++;

				// If there are nested bullets, append them to the task file
				if (checkboxLine.nestedBullets.length > 0) {
					const taskFile = task.file;
					const currentContent = await this.app.vault.read(taskFile);

					// Find the minimum indentation level among nested bullets
					let minIndent = Infinity;
					checkboxLine.nestedBullets.forEach((bullet) => {
						const match = bullet.match(/^(\s*)/);
						if (match) {
							minIndent = Math.min(minIndent, match[1].length);
						}
					});

					// Remove the minimum indentation from all bullets
					const normalizedBullets = checkboxLine.nestedBullets.map(
						(bullet) => {
							return bullet.substring(minIndent);
						},
					);

					const notesSection = `\n# Notes\n\n${normalizedBullets.join("\n")}\n`;
					await this.app.vault.modify(
						taskFile,
						currentContent + notesSection,
					);
				}

				const newLine = `${checkboxLine.indent}- [ ] [[${task.name}]]`;
				replacements.push({
					lineIndex: checkboxLine.lineIndex,
					newLine,
				});
			}
		}

		// Replace the checkbox lines with links to the created tasks
		if (replacements.length > 0 && selectionRange) {
			const updatedLines = [...lines];
			replacements.forEach(({ lineIndex, newLine }) => {
				updatedLines[lineIndex] = newLine;
			});

			const newText = updatedLines.join("\n");
			editor.replaceRange(
				newText,
				selectionRange.from,
				selectionRange.to,
			);
		}

		// Display success message
		new Notice(
			`Created ${createdCount} task${createdCount !== 1 ? "s" : ""} for project [${selectedProject.name}]`,
		);
	};

	setActiveTaskStatus = (status: TaskStatus) => {
		const activeTask = getActiveTask(this.app);
		if (activeTask) {
			activeTask.status = status;
			updateTask(this.app, activeTask);
			new Notice(
				`Task [${activeTask.name}] set to [${this.getStatusDisplay(status)}]...`,
			);

			// Open parent project when task is marked as Done
			if (status === TaskStatus.Done) {
				const activeProject = getActiveProject(this.app);
				if (activeProject) {
					this.app.workspace
						.getLeaf(false)
						.openFile(activeProject.file);
				}
			}
		}
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
			default:
				return status;
		}
	};

	setActiveTaskPriority = (priority: TaskPriority) => {
		const activeTask = getActiveTask(this.app);
		if (activeTask) {
			activeTask.priority = priority;
			updateTask(this.app, activeTask);
			new Notice(
				`Task [${activeTask.name}] set to [${this.getPriorityDisplay(priority)}]...`,
			);
		}
	};

	setTaskPriority = (file: TFile, priority: TaskPriority) => {
		const task = getTask(this.app, file.path);
		if (task) {
			task.priority = priority;
			updateTask(this.app, task);
			new Notice(
				`Task [${task.name}] set to [${this.getPriorityDisplay(priority)}]...`,
			);
		}
	};

	setTaskStatus = (file: TFile, status: TaskStatus) => {
		const task = getTask(this.app, file.path);
		if (task) {
			task.status = status;
			updateTask(this.app, task);
			new Notice(
				`Task [${task.name}] set to [${this.getStatusDisplay(status)}]...`,
			);

			// Open parent project when task is marked as Done
			if (status === TaskStatus.Done) {
				const activeProject = getActiveProject(this.app);
				if (activeProject) {
					this.app.workspace
						.getLeaf(false)
						.openFile(activeProject.file);
				}
			}
		}
	};

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

	async displayTaskNameInput(selectedProject: Project) {
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
		const task = await createNewTask(this.app, name, selectedProject);
		if (task) {
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

		const sanitizedMeetingName = trimmedMeetingName.replace(/[:\\/]/g, "").trim();
		if (!sanitizedMeetingName) {
			new Notice("Meeting name cannot be blank");
			return;
		}

		const templateName = this.getMeetingTemplateName(meetingType);
		const fileName = this.getUniqueMeetingFileName(sanitizedMeetingName);
		const filePath = `Projects/Work/${fileName}.md`;

		const file = await createFileFromTemplate(this.app, filePath, templateName);
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
