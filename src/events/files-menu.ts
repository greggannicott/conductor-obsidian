import { App, Menu, TFile } from "obsidian";
import { TaskPriority } from "../tasks";
import { setTaskPriorityForFiles } from "../commands/set-priority";
import { touchTaskFiles } from "../commands/touch-task";

export function createFilesMenuHandler(app: App) {
	return (menu: Menu, files: any[]) => {
		const selectedFiles = (files ?? []).filter(
			(f): f is TFile => f instanceof TFile,
		);
		if (selectedFiles.length === 0) return;

		const selectedTaskFiles = selectedFiles.filter((file) => {
			const metadata = app.metadataCache.getFileCache(file);
			const categories = metadata?.frontmatter?.categories;
			return (
				categories &&
				Array.isArray(categories) &&
				categories.includes("[[Task]]")
			);
		});

		if (selectedTaskFiles.length === 0) return;

		menu.addItem((item: any) => {
			item.setTitle("Set Priority");
			const submenu = (item as any).setSubmenu();

			submenu.addItem((subItem: any) => {
				subItem.setTitle("🔴 - High");
				subItem.onClick(() => {
					void setTaskPriorityForFiles(app, selectedTaskFiles, TaskPriority.High);
				});
			});

			submenu.addItem((subItem: any) => {
				subItem.setTitle("🟡 - Medium");
				subItem.onClick(() => {
					void setTaskPriorityForFiles(app, selectedTaskFiles, TaskPriority.Medium);
				});
			});

			submenu.addItem((subItem: any) => {
				subItem.setTitle("🟢 - Low");
				subItem.onClick(() => {
					void setTaskPriorityForFiles(app, selectedTaskFiles, TaskPriority.Low);
				});
			});
		});

		menu.addItem((item: any) => {
			item.setTitle("Touch Task");
			item.onClick(() => {
				void touchTaskFiles(app, selectedTaskFiles);
			});
		});
	};
}
