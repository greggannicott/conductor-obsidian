import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Plugin,
	TFile,
} from "obsidian";
import { insertLinkByCategory } from "./commands/insert-link-by-category";
import { insertLinkByTopic } from "./commands/insert-link-by-topic";
import { insertProjectLink } from "./commands/insert-project-link";
import { insertTaskLinks } from "./commands/insert-task-links";

type MenuEntry = {
	label: string;
	run: (app: App) => Promise<boolean>;
};

// The five entries shown by the `:::` trigger. Hard-coded (not derived from
// registered commands) so the labels and ordering stay stable.
const MENU: MenuEntry[] = [
	{ label: "Insert Link by Category", run: (app) => insertLinkByCategory(app) },
	{ label: "Insert Link by Topic", run: (app) => insertLinkByTopic(app) },
	{
		label: "Insert Journal Link",
		run: (app) => insertLinkByCategory(app, { preselectCategory: "Journal" }),
	},
	{ label: "Insert Task Links", run: (app) => insertTaskLinks(app) },
	{ label: "Insert Project Link", run: (app) => insertProjectLink(app) },
];

function isInCodeBlockOrFrontmatter(
	app: App,
	file: TFile,
	cursor: EditorPosition,
): boolean {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return false; // fail open when the cache is cold
	const fm = cache.frontmatterPosition;
	if (fm && cursor.line >= fm.start.line && cursor.line <= fm.end.line) {
		return true;
	}
	for (const section of cache.sections ?? []) {
		if (
			section.type === "code" &&
			cursor.line >= section.position.start.line &&
			cursor.line <= section.position.end.line
		) {
			return true;
		}
	}
	return false;
}

class ThreeColonsSuggest extends EditorSuggest<MenuEntry> {
	constructor(app: App) {
		super(app);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null,
	): EditorSuggestTriggerInfo | null {
		if (!file) return null;
		if (isInCodeBlockOrFrontmatter(this.app, file, cursor)) return null;

		const before = editor.getLine(cursor.line).substring(0, cursor.ch);
		// `:::` preceded by start-of-line or whitespace, followed by word chars.
		const match = before.match(/(^|\s)(:::\w*)$/);
		if (!match) return null;

		const token = match[2];
		const tokenStartCh = cursor.ch - token.length;

		return {
			start: { line: cursor.line, ch: tokenStartCh },
			end: { line: cursor.line, ch: cursor.ch },
			query: token.slice(3),
		};
	}

	getSuggestions(context: EditorSuggestContext): MenuEntry[] {
		const q = context.query.toLowerCase();
		if (q === "") return [...MENU];
		return MENU.filter((entry) =>
			entry.label.toLowerCase().includes(q),
		);
	}

	renderSuggestion(value: MenuEntry, el: HTMLElement): void {
		el.setText(value.label);
	}

	selectSuggestion(value: MenuEntry, evt: MouseEvent | KeyboardEvent): void {
		const ctx = this.context;
		if (!ctx) {
			this.close();
			return;
		}
		const editor = ctx.editor;
		const start = { line: ctx.start.line, ch: ctx.start.ch };
		const end = { line: ctx.end.line, ch: ctx.end.ch };
		const original = editor.getRange(
			ctx.start as EditorPosition,
			ctx.end as EditorPosition,
		);
		this.close();
		void this.runEntry(value, editor, start, end, original);
	}

	private async runEntry(
		entry: MenuEntry,
		editor: Editor,
		start: { line: number; ch: number },
		end: { line: number; ch: number },
		original: string,
	): Promise<void> {
		// Remove the trigger text first so the command inserts where it was.
		editor.replaceRange("", start as EditorPosition, end as EditorPosition);
		editor.setCursor(start as EditorPosition);
		try {
			editor.focus();
		} catch {
			// ignore
		}

		const inserted = await entry.run(this.app);
		if (!inserted) {
			// Restore the document byte-for-byte and leave the cursor after it.
			editor.replaceRange(original, start as EditorPosition);
			editor.setCursor({
				line: start.line,
				ch: start.ch + original.length,
			});
		}
	}
}

export function registerInsertLinkSuggest(plugin: Plugin): void {
	plugin.registerEditorSuggest(new ThreeColonsSuggest(plugin.app));
}