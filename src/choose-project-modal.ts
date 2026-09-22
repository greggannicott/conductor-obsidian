import { App } from "obsidian";
import type { ConductorSelectorMeta } from "./conductor-selector-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import {
	compareProjects,
	getProjectSearchFields,
	Project,
} from "./projects";
import { getStatusDisplay } from "./utilities";

// Display truncation length for project names in pickers.
export const PROJECT_TITLE_MAX_LENGTH = 120;

// The standard project picker: active-first, alphabetical ordering, a jira id
// prefixed onto the name when present, and context/status/ongoing meta. No
// covers - projects don't have any. Callers pass `initialValue` to prefill
// the search input (selected on open so it is easy to replace).
export function showProjectSelector(
	app: App,
	projects: Project[],
	initialValue?: string,
): Promise<Project | null> {
	return ConductorSelectorModal.show(app, {
		items: [...(projects ?? [])].sort(compareProjects),
		placeholder: "Select a project...",
		initialValue,
		titleMaxLength: PROJECT_TITLE_MAX_LENGTH,
		getText: (project) =>
			project.jiraId ? `${project.jiraId}: ${project.name}` : project.name,
		getSearchTexts: (project) => getProjectSearchFields(project),
		getMeta: (project) => {
			const meta: ConductorSelectorMeta[] = [
				{ label: "Context", value: project.context },
			];
			if (project.ongoing) {
				meta.push({ label: "Ongoing", value: "✓" });
			} else if (project.status) {
				meta.push({ label: "Status", value: getStatusDisplay(project.status) });
			}
			return meta;
		},
		sortItems: compareProjects,
	});
}