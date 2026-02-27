import { TFile, FuzzySuggestModal, App } from "obsidian";

type onChooseCallback = (project: TFile) => void;

export class ChooseProjectModal extends FuzzySuggestModal<TFile> {
	public projects: TFile[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a project...");
	}

	getItems(): TFile[] {
		return this.projects;
	}

	getItemText(project: TFile): string {
		return project.basename;
	}

	onChooseItem(project: TFile, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(project);
	}
}
