import { App } from "obsidian";
import { projectSelectorOptions } from "./choose-project-modal";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { getOutstandingProjects, Project } from "./projects";

// Outstanding projects only, grouped by status on open. Rows and search reuse
// the standard project picker so the context/status meta line and sorting stay
// consistent with the other project selectors.
export function showOutstandingProjectsSelector(app: App): Promise<Project[]> {
	return ConductorSelectorModal.showMulti<Project>(app, {
		...projectSelectorOptions(app, getOutstandingProjects(app)),
		placeholder: "Filter projects by name or status...",
		emptyText: "No outstanding projects",
		initialGroupingId: "status",
	});
}
