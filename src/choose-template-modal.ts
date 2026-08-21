import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

type onChooseCallback = (templateName: string) => void;

export class ChooseTemplateModal {
	public templates: string[];
	public onChoose: onChooseCallback;

	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		new ConductorSelectorModal<string>(this.app, {
			items: this.templates ?? [],
			placeholder: "Select a template...",
			getText: (templateName) => templateName,
			onSelect: (templateName) => this.onChoose(templateName),
		}).open();
	}
}
