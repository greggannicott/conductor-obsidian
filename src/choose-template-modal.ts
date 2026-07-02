import { FuzzySuggestModal, App } from "obsidian";

type onChooseCallback = (templateName: string) => void;

export class ChooseTemplateModal extends FuzzySuggestModal<string> {
	public templates: string[];
	public onChoose: onChooseCallback;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select a template...");
	}

	getItems(): string[] {
		return this.templates;
	}

	getItemText(templateName: string): string {
		return templateName;
	}

	onChooseItem(templateName: string, _: MouseEvent | KeyboardEvent) {
		this.onChoose(templateName);
	}
}
