import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

type onChooseCallback = (file: TFile) => void;

export class ChooseNoteModal {
	public notes: TFile[];
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<TFile>(this.app, {
			items: this.notes ?? [],
			placeholder: "Select a note...",
			getText: (file) => file.basename,
			onSelect: (file) => this.onChoose(file),
		}).open();
	}
}
