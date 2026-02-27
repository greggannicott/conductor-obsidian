import { TFile, FuzzySuggestModal, App } from "obsidian";
import { Project } from "./projects";

type onChooseCallback = (project: Project) => void;

export class ChooseProjectModal extends FuzzySuggestModal<Project> {
	public projects: Project[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a project...");
	}

	getItems(): Project[] {
		return this.projects;
	}

	getItemText(project: Project): string {
		return `${project.context} -> ${project.name}`;
	}

	onChooseItem(project: Project, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(project);
	}
}
