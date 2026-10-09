import { App, TFile } from "obsidian";
import { ConductorSelectorModal } from "./conductor-selector-modal";
import { getProblems, Problem } from "./problems";

const compareProblems = (a: Problem, b: Problem): number =>
	a.name.localeCompare(b.name);

export function showProblemSelector(
	app: App,
	preselectedFiles: TFile[] = [],
): Promise<Problem[]> {
	// Selector items are freshly built objects, so match preselection by path.
	const items = getProblems(app);
	const preselectedPaths = new Set(preselectedFiles.map((f) => f.path));
	return ConductorSelectorModal.showMulti<Problem>(app, {
		items,
		placeholder: "Filter problems by name...",
		emptyText: "No problem notes found",
		getText: (problem) => problem.name,
		initialSelection: items.filter((p) => preselectedPaths.has(p.path)),
		sortItems: compareProblems,
	});
}
