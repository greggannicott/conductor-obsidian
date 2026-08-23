import { App, Menu, Notice, TFile } from "obsidian";
import {
	getTask,
	TaskStatus,
	TASK_STATUSES,
	TASK_PRIORITIES,
	outstandingTaskTypes,
} from "../tasks";
import {
	getProjectFromFile,
	ProjectStatus,
	outstandingProjectTypes,
} from "../projects";
import { addTag, getStatusDisplay, getPriorityDisplay } from "../utilities";
import { setTaskStatus } from "../commands/set-status";
import { setTaskPriority } from "../commands/set-priority";
import { touchTaskFiles } from "../commands/touch-task";
import { setProjectStatus } from "../commands/set-status";
import { convertNoteToTask } from "../commands/convert-note-to-task";

export function createFileMenuHandler(app: App) {
	return (menu: Menu, file: TFile) => {
		if (!(file instanceof TFile)) return;

		const metadata = app.metadataCache.getFileCache(file);
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
			const task = getTask(app, file.path);

			menu.addItem((item) => {
				item.setTitle("Set Status");
				const submenu = (item as any).setSubmenu();
				TASK_STATUSES.forEach((status, index) => {
					if (index === outstandingTaskTypes.length) {
						submenu.addSeparator();
					}
					submenu.addItem((subItem: any) => {
						subItem.setTitle(getStatusDisplay(status));
						if (task && task.status === status) {
							subItem.setChecked(true);
						}
						subItem.onClick(() => {
							setTaskStatus(app, file, status);
						});
					});
				});
			});

			menu.addItem((item) => {
				item.setTitle("Set Priority");
				const submenu = (item as any).setSubmenu();
				for (const priority of TASK_PRIORITIES) {
					submenu.addItem((subItem: any) => {
						subItem.setTitle(getPriorityDisplay(priority));
						if (task && task.priority === priority) {
							subItem.setChecked(true);
						}
						subItem.onClick(() => {
							setTaskPriority(app, file, priority);
						});
					});
				}
			});

			menu.addItem((item) => {
				item.setTitle("Touch Task");
				item.onClick(() => {
					void touchTaskFiles(app, [file]);
				});
			});
		}

		if (isProject) {
			const project = getProjectFromFile(app, file);

			menu.addItem((item) => {
				item.setTitle("Set Status");
				const submenu = (item as any).setSubmenu();
				TASK_STATUSES.forEach((status, index) => {
					// ProjectStatus values mirror TaskStatus values exactly.
					const projectStatus = status as unknown as ProjectStatus;
					if (index === outstandingProjectTypes.length) {
						submenu.addSeparator();
					}
					submenu.addItem((subItem: any) => {
						subItem.setTitle(getStatusDisplay(projectStatus));
						if (project && project.status === projectStatus) {
							subItem.setChecked(true);
						}
						subItem.onClick(() => {
							setProjectStatus(app, file, projectStatus);
						});
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
					addTag(app, file, "reflected");
				});
			});
		}

		if (
			file.extension === "md" &&
			!isTask &&
			!isProject &&
			!file.path.startsWith("_templates/")
		) {
			menu.addItem((item) => {
				item.setTitle("Convert to Task");
				item.onClick(() => {
					void convertNoteToTask(app, file);
				});
			});
		}

		if (!file.path.startsWith("References/")) {
			menu.addItem((item) => {
				item.setTitle("Move to References");
				item.onClick(async () => {
					const refFolder = app.vault.getAbstractFileByPath("References");
					if (!refFolder) {
						await app.vault.createFolder("References");
					}

					let newPath = `References/${file.name}`;
					let counter = 1;
					while (app.vault.getFileByPath(newPath)) {
						const ext = file.extension ? `.${file.extension}` : "";
						const baseName = file.basename;
						newPath = `References/${baseName} ${counter}${ext}`;
						counter++;
					}

					await app.vault.rename(file, newPath);
					new Notice(`Moved to ${newPath}`);
				});
			});
		}
	};
}
