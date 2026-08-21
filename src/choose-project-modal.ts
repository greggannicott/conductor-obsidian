import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Project } from "./projects";

type onChooseCallback = (project: Project) => void;

export class ChooseProjectModal {
	public projects: Project[];
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<Project>(this.app, {
			items: this.projects ?? [],
			placeholder: "Select a project...",
			getText: (project) => `${project.context} -> ${project.name}`,
			onSelect: (project) => this.onChoose(project),
		}).open();
	}
}
