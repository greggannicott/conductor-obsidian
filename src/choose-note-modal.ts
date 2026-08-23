import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export function showNoteSelector(
	app: App,
	notes: TFile[],
): Promise<TFile | null> {
	return ConductorSelectorModal.show(app, {
		items: notes ?? [],
		placeholder: "Select a note...",
		getText: (file) => file.basename,
	});
}
