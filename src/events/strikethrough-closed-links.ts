import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { App, MarkdownView, Plugin, TFile, editorInfoField } from "obsidian";
import { closedTaskTypes } from "../tasks";
import { closedProjectStatuses } from "../projects";
import { Category, getCategory } from "../utilities";

const TASK_CLOSED_CLASS = "conductor-task-closed";
const PROJECT_CLOSED_CLASS = "conductor-project-closed";
const CLOSED_CLASSES = [TASK_CLOSED_CLASS, PROJECT_CLOSED_CLASS];

function isTaskOrProjectFile(app: App, file: TFile): boolean {
	const category = getCategory(app, file);
	return category === Category.Task || category === Category.Project;
}

// The class a link's target note earns, or null while it is still outstanding:
// closed tasks are struck through, and so are closed projects that aren't
// ongoing (an ongoing project is outstanding whatever its status).
function getClosedLinkClass(app: App, file: TFile): string | null {
	const category = getCategory(app, file);
	const status = app.metadataCache.getFileCache(file)?.frontmatter?.["status"];
	if (category === Category.Task) {
		return closedTaskTypes.includes(status) ? TASK_CLOSED_CLASS : null;
	}
	if (category === Category.Project) {
		const ongoing =
			app.metadataCache.getFileCache(file)?.frontmatter?.["ongoing"] ===
			true;
		if (ongoing) return null;
		return closedProjectStatuses.includes(status)
			? PROJECT_CLOSED_CLASS
			: null;
	}
	return null;
}

const WIKILINK_REGEX = /\[\[([^[\]]*)\]\]/g;

function createClosedLinkDecorationExtension(app: App) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = compute(view);
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = compute(update.view);
				}
			}

			recompute(view: EditorView): void {
				this.decorations = compute(view);
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	);

	function compute(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const file = view.state.field(editorInfoField).file;
		if (!file) return builder.finish();
		const sourcePath = file.path;

		const taskMark = Decoration.mark({ class: TASK_CLOSED_CLASS });
		const projectMark = Decoration.mark({ class: PROJECT_CLOSED_CLASS });
		const doc = view.state.doc;

		for (let pos = 0; pos < doc.length; ) {
			const line = doc.lineAt(pos);
			const text = line.text;
			WIKILINK_REGEX.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = WIKILINK_REGEX.exec(text))) {
				const linkContent = match[1].trim();
				const targetName = linkContent.split("|")[0].split("#")[0].trim();
				const target = app.metadataCache.getFirstLinkpathDest(
					targetName,
					sourcePath,
				);
				if (!target) continue;
				const closedClass = getClosedLinkClass(app, target);
				if (!closedClass) continue;
				const from = line.from + match.index;
				const to = from + match[0].length;
				builder.add(
					from,
					to,
					closedClass === TASK_CLOSED_CLASS ? taskMark : projectMark,
				);
			}
			pos = line.to + 1;
		}
		return builder.finish();
	}
}

export function registerClosedLinkStrikethrough(plugin: Plugin): void {
	const app = plugin.app;

	const closedLinkDecoration = createClosedLinkDecorationExtension(app);
	plugin.registerEditorExtension(closedLinkDecoration);

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		el.querySelectorAll("a.internal-link").forEach((link) => {
			const href = link.getAttribute("href");
			if (!href) return;

			const target = app.metadataCache.getFirstLinkpathDest(
				href,
				ctx.sourcePath,
			);
			const closedClass = target ? getClosedLinkClass(app, target) : null;
			for (const className of CLOSED_CLASSES) {
				link.classList.toggle(className, className === closedClass);
			}
		});
	});

	plugin.registerEvent(
		app.metadataCache.on("changed", (file: TFile) => {
			if (!isTaskOrProjectFile(app, file)) return;

			const refs = app.metadataCache.resolvedLinks;
			app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
				const view = leaf.view as MarkdownView;
				const sourceFile = view.file;
				if (!sourceFile || !refs[sourceFile.path]?.[file.path]) return;

				view.previewMode.rerender(true);

				const cm = (
					view.editor as unknown as { cm?: EditorView }
				).cm;
				const decoration = cm?.plugin(closedLinkDecoration);
				if (decoration && cm) {
					decoration.recompute(cm);
					cm.dispatch({});
				}
			});
		}),
	);
}
