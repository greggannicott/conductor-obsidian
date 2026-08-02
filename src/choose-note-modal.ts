import { FuzzySuggestModal, App, TFile } from "obsidian";

type onChooseCallback = (file: TFile) => void;

export class ChooseNoteModal extends FuzzySuggestModal<TFile> {
	public notes: TFile[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a note...");
	}

	getItems(): TFile[] {
		return this.notes;
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	onChooseItem(file: TFile, _: MouseEvent | KeyboardEvent) {
		this.onChoose(file);
	}
}
