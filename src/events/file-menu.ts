import { App, Menu, Notice, TFile } from "obsidian";
import {
	getTask,
	TASK_STATUSES,
	TASK_PRIORITIES,
	outstandingTaskTypes,
} from "../tasks";
import {
	getProjectFromFile,
	getRelatedTicketIdForFile,
	ProjectStatus,
	outstandingProjectTypes,
} from "../projects";
import { TASK_SIZES } from "../tasks";
import {
	addTag,
	fileHasTag,
	getStatusDisplay,
	getPriorityDisplay,
	getSizeDisplay,
	isFileCategory,
} from "../utilities";
import { addListen } from "../commands/add-listen";
import { addViewing } from "../commands/add-viewing";
import { showAddToBacklog } from "../commands/add-to-backlog";
import {
	getRateableRelease,
	getReleaseFile,
	getReleaseRating,
} from "../music-release";
import {
	RATING_OPTIONS,
	getRatingLabel,
	rateRelease,
} from "../commands/rate-release";
import { showRemoveFromRotation } from "../commands/add-to-rotation";
import {
	BacklogItemStatus,
	hasUnresolvedBacklogItems,
	getBacklogItemReleaseName,
	getBacklogItemStatus,
	markBacklogItemsSkipped,
	setBacklogItemStatus,
} from "../backlog";
import { setTaskStatus } from "../commands/set-status";
import { setTaskPriority } from "../commands/set-priority";
import { setTaskSize } from "../commands/set-size";
import {
	toggleForFocusing,
	isForFocusing,
} from "../commands/for-focusing";
import { touchTaskFiles } from "../commands/touch-task";
import { setProjectStatus } from "../commands/set-status";
import { convertNoteToTask } from "../commands/convert-note-to-task";
import { openRelatedLinearTicketForFile } from "../commands/linear";
import { getInboxTriageActions } from "../base-views/inbox-triage-actions";

/** Notes can carry #inbox in frontmatter or as an inline tag. */
function hasInboxTag(app: App, file: TFile): boolean {
	return (
		fileHasTag(app, file, "inbox") ||
		app.metadataCache
			.getFileCache(file)
			?.tags?.some((tag) => tag.tag === "#inbox") === true
	);
}

export function createFileMenuHandler(app: App, linearBaseUrl?: string) {
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
				item.setTitle("Set Size");
				const submenu = (item as any).setSubmenu();
				for (const size of TASK_SIZES) {
					submenu.addItem((subItem: any) => {
						subItem.setTitle(getSizeDisplay(size));
						if (task && task.size === size) {
							subItem.setChecked(true);
						}
						subItem.onClick(() => {
							setTaskSize(app, file, size);
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

		if (isTask || isProject) {
			const ticketId = getRelatedTicketIdForFile(app, file);

			if (ticketId) {
				menu.addItem((item) => {
					item.setTitle("Open Related Linear Ticket");
					item.onClick(() => {
						openRelatedLinearTicketForFile(app, file, linearBaseUrl);
					});
				});
			}
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

		const isMovie =
			file.extension === "md" && isFileCategory(app, file, "Movie");

		if (isMovie) {
			menu.addItem((item) => {
				item.setTitle("Record Viewing");
				item.onClick(() => {
					void addViewing(app, file);
				});
			});
		}

		const isMusicRelease =
			categories &&
			Array.isArray(categories) &&
			categories.includes("[[Music Release]]");

		if (isMusicRelease) {
			menu.addItem((item) => {
				item.setTitle("Add to Listening Backlog");
				item.onClick(() => {
					void showAddToBacklog(app, file, true);
				});
			});

			menu.addItem((item) => {
				item.setTitle("Record Listen");
				item.onClick(() => {
					void addListen(app, file);
				});
			});

			if (hasUnresolvedBacklogItems(app, file.basename)) {
				menu.addItem((item) => {
					item.setTitle("Mark as Skipped");
					item.onClick(() => {
						void markBacklogItemsSkipped(
							app,
							file.basename,
						).then((count) => {
							new Notice(
								`Marked ${count} backlog item(s) as skipped`,
							);
						});
					});
				});
			}
		}

		const isBacklogItem =
			categories &&
			Array.isArray(categories) &&
			categories.includes("[[Backlog Item]]");

		if (isBacklogItem) {
			const status = getBacklogItemStatus(app, file);
			const isUnresolved =
				status === null || status === BacklogItemStatus.ToListen;

			if (isUnresolved) {
				menu.addItem((item) => {
					item.setTitle("Record Listen");
					item.onClick(() => {
						const releaseName = getBacklogItemReleaseName(app, file);
						if (!releaseName) {
							new Notice("Backlog item has no linked music release");
							return;
						}
						const release = getReleaseFile(app, releaseName, file.path);
						if (!release) {
							new Notice(`Music release [${releaseName}] not found`);
							return;
						}
						void addListen(app, release);
					});
				});

				menu.addItem((item) => {
					item.setTitle("Mark as Skipped");
					item.onClick(() => {
						void setBacklogItemStatus(
							app,
							file,
							BacklogItemStatus.Skipped,
						).then(() => {
							new Notice("Backlog item marked as skipped");
						});
					});
				});
			}
		}

		const rateReleaseTarget = getRateableRelease(app, file);
		if (rateReleaseTarget) {
			menu.addItem((item) => {
				item.setTitle("Add to Rotation");
				item.onClick(() => {
					void showRemoveFromRotation(app, rateReleaseTarget);
				});
			});

			const currentRating = getReleaseRating(app, rateReleaseTarget);
			menu.addItem((item) => {
				item.setTitle("Rate");
				const submenu = (item as any).setSubmenu();
				for (const rating of RATING_OPTIONS) {
					submenu.addItem((subItem: any) => {
						subItem.setTitle(getRatingLabel(rating));
						subItem.setChecked(currentRating === rating);
						subItem.onClick(() => {
							void rateRelease(app, rateReleaseTarget, rating);
						});
					});
				}
				submenu.addSeparator();
				submenu.addItem((subItem: any) => {
					subItem.setTitle("Clear");
					subItem.onClick(() => {
						void rateRelease(app, rateReleaseTarget, 0);
					});
				});
			});
		}

		if (file.extension === "md" && isFileCategory(app, file, "Music Release")) {
			menu.addItem((item) => {
				item.setTitle("For Focusing");
				item.setChecked(isForFocusing(app, file));
				item.onClick(() => {
					void toggleForFocusing(app, file);
				});
			});
		}

		const hasTargetCategory =
			file.extension === "md" &&
			!file.path.startsWith("_templates/") &&
			isFileCategory(app, file, "Music Release", "Artist", "Label");

		if (hasTargetCategory && !fileHasTag(app, file, "reason-done")) {
			menu.addItem((item) => {
				item.setTitle("Add '#reason-done' Tag");
				item.onClick(() => {
					addTag(app, file, "reason-done");
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

		// Only inbox notes get the triage submenu, so other file menus are
		// unaffected when the view uses Obsidian's built-in menu.
		if (hasInboxTag(app, file)) {
			menu.addItem((item) => {
				// Leave the section unset so Triage sits with the other
				// Conductor items (e.g. "Move to References").
				item.setTitle("Triage").setIcon("inbox");
				const submenu = (item as any).setSubmenu() as Menu;
				for (const action of getInboxTriageActions(app)) {
					submenu.addItem((subItem) => {
						subItem
							.setTitle(action.menuTitle ?? action.tooltip)
							.setIcon(action.icon)
							.setDisabled(action.disabled?.(file) ?? false)
							.setWarning(action.warning ?? false)
							.onClick(() => {
								void action.run(file);
							});
					});
				}
			});
		}
	};
}
