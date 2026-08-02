import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import {
	App,
	MarkdownView,
	Plugin,
	TFile,
	editorInfoField,
	parseFrontMatterStringArray,
} from "obsidian";
import { closedTaskTypes } from "../tasks";

const TASK_CLOSED_CLASS = "conductor-task-closed";

function isTaskFile(app: App, file: TFile): boolean {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const categories = parseFrontMatterStringArray(frontmatter, "categories");
	return categories?.includes("[[Task]]") ?? false;
}

function isClosedTask(app: App, file: TFile): boolean {
	if (!isTaskFile(app, file)) return false;
	const status = app.metadataCache.getFileCache(file)?.frontmatter?.["status"];
	return closedTaskTypes.includes(status);
}

const WIKILINK_REGEX = /\[\[([^\[\]\n]*)\]\]/g;

function createTaskLinkDecorationExtension(app: App) {
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

		const mark = Decoration.mark({ class: TASK_CLOSED_CLASS });
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
				if (target && isClosedTask(app, target)) {
					const from = line.from + match.index;
					const to = from + match[0].length;
					builder.add(from, to, mark);
				}
			}
			pos = line.to + 1;
		}
		return builder.finish();
	}
}

export function registerTaskLinkStrikethrough(plugin: Plugin): void {
	const app = plugin.app;

	const taskLinkDecoration = createTaskLinkDecorationExtension(app);
	plugin.registerEditorExtension(taskLinkDecoration);

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		el.querySelectorAll("a.internal-link").forEach((link) => {
			const href = link.getAttribute("href");
			if (!href) return;

			const target = app.metadataCache.getFirstLinkpathDest(
				href,
				ctx.sourcePath,
			);
			const closed = target !== null && isClosedTask(app, target);
			if (closed) {
				link.classList.add(TASK_CLOSED_CLASS);
			} else {
				link.classList.remove(TASK_CLOSED_CLASS);
			}
		});
	});

	plugin.registerEvent(
		app.metadataCache.on("changed", (file: TFile) => {
			if (!isTaskFile(app, file)) return;

			const refs = app.metadataCache.resolvedLinks;
			app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
				const view = leaf.view as MarkdownView;
				const sourceFile = view.file;
				if (!sourceFile || !refs[sourceFile.path]?.[file.path]) return;

				view.previewMode.rerender(true);

				const cm = (
					view.editor as unknown as { cm?: EditorView }
				).cm;
				const decoration = cm?.plugin(taskLinkDecoration);
				if (decoration && cm) {
					decoration.recompute(cm);
					cm.dispatch({});
				}
			});
		}),
	);
}
