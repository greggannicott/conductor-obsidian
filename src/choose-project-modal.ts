import { App } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { Project } from "./projects";

export function showProjectSelector(
	app: App,
	projects: Project[],
): Promise<Project | null> {
	return ConductorSelectorModal.show(app, {
		items: projects ?? [],
		placeholder: "Select a project...",
		getText: (project) => `${project.context} -> ${project.name}`,
		getSearchText: (project) =>
			`${project.context} -> ${project.name} ${project.jiraId}`,
		getBadges: (project) =>
			project.jiraId ? [project.jiraId] : [],
	});
}
