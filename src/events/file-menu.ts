import { App, Menu, Notice, TFile } from "obsidian";
import { getTask, TaskStatus, TaskPriority } from "../tasks";
import { getProjectFromFile, ProjectStatus } from "../projects";
import { addTag } from "../utilities";
import { setTaskStatus } from "../commands/set-status";
import { setTaskPriority } from "../commands/set-priority";
import { touchTaskFiles } from "../commands/touch-task";
import { setProjectStatus } from "../commands/set-status";

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
				submenu.addItem((subItem: any) => {
					subItem.setTitle("⭕ - To Do");
					if (task && task.status === TaskStatus.ToDo) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskStatus(app, file, TaskStatus.ToDo);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🔄 - In Progress");
					if (task && task.status === TaskStatus.InProgress) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskStatus(app, file, TaskStatus.InProgress);
					});
				});
				submenu.addSeparator();
				submenu.addItem((subItem: any) => {
					subItem.setTitle("✅ - Done");
					if (task && task.status === TaskStatus.Done) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskStatus(app, file, TaskStatus.Done);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("❌ - Abandoned");
					if (task && task.status === TaskStatus.Abandoned) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskStatus(app, file, TaskStatus.Abandoned);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🙅🏼‍♂️ - Won't Do");
					if (task && task.status === TaskStatus.WontDo) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskStatus(app, file, TaskStatus.WontDo);
					});
				});
			});

			menu.addItem((item) => {
				item.setTitle("Set Priority");
				const submenu = (item as any).setSubmenu();
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🔴 - High");
					if (task && task.priority === TaskPriority.High) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskPriority(app, file, TaskPriority.High);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🟡 - Medium");
					if (task && task.priority === TaskPriority.Medium) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskPriority(app, file, TaskPriority.Medium);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🟢 - Low");
					if (task && task.priority === TaskPriority.Low) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setTaskPriority(app, file, TaskPriority.Low);
					});
				});
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
				submenu.addItem((subItem: any) => {
					subItem.setTitle("⭕ - To Do");
					if (project && project.status === ProjectStatus.ToDo) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setProjectStatus(app, file, ProjectStatus.ToDo);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("🔄 - In Progress");
					if (project && project.status === ProjectStatus.InProgress) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setProjectStatus(app, file, ProjectStatus.InProgress);
					});
				});
				submenu.addSeparator();
				submenu.addItem((subItem: any) => {
					subItem.setTitle("✅ - Done");
					if (project && project.status === ProjectStatus.Done) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setProjectStatus(app, file, ProjectStatus.Done);
					});
				});
				submenu.addItem((subItem: any) => {
					subItem.setTitle("❌ - Abandoned");
					if (project && project.status === ProjectStatus.Abandoned) {
						subItem.setChecked(true);
					}
					subItem.onClick(() => {
						setProjectStatus(app, file, ProjectStatus.Abandoned);
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
