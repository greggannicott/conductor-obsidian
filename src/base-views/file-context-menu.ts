import { App, Menu, TFile } from "obsidian";

type FileContextMenuView = {
	onFileContextMenu?: (event: MouseEvent, file: TFile) => void;
};

/**
 * Show the menu Obsidian uses when a file is right-clicked in the file
 * explorer. The explorer view builds its own core items (Rename, Delete, Open
 * in new tab, ...) and then fires `file-menu`, so plugin items are included
 * too.
 *
 * `onFileContextMenu` is not part of the public API, so fall back to a plain
 * file-aware menu if it isn't available (for example if the explorer is
 * disabled or a future Obsidian version renames it).
 */
export function showFileContextMenu(
	app: App,
	file: TFile,
	evt: MouseEvent,
): void {
	const explorerView = app.workspace.getLeavesOfType("file-explorer")[0]
		?.view as FileContextMenuView | undefined;

	if (explorerView?.onFileContextMenu) {
		try {
			explorerView.onFileContextMenu(evt, file);
			return;
		} catch (error) {
			console.error("Conductor: could not open native file menu", error);
		}
	}

	const menu = new Menu();
	app.workspace.trigger("file-menu", menu, file, "conductor-triage-view");
	menu.showAtMouseEvent(evt);
}
