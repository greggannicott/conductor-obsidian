import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";

export function showTemplateSelector(
	app: App,
	templateNames: string[],
): Promise<string | null> {
	return ConductorSelectorModal.show(app, {
		items: templateNames ?? [],
		placeholder: "Select a template...",
		getText: (templateName) => templateName,
	});
}
