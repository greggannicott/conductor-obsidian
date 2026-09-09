import { EditorView } from "@codemirror/view";
import {
	App,
	MarkdownView,
	Plugin,
	TFile,
} from "obsidian";

const HEADING = "# Working Notes";
const CODE_BLOCK_LANG = "project-overview";
const QA_BLOCK_CLASS = "conductor-qa-block";

// ── Parsing ──────────────────────────────────────────────────────────

interface TreeNode {
	content: string;
	children: TreeNode[];
}

interface QAPair {
	question: string;
	answer: string;
}

const BULLET_RE = /^(\s*)[-*]\s(?:\[[ x]\]\s)?/;

function detectIndentUnit(lines: string[]): "tab" | number {
	for (const line of lines) {
		const m = BULLET_RE.exec(line);
		if (m && m[1].length > 0) {
			return m[1].includes("\t") ? "tab" : 2;
		}
	}
	return 2;
}

function countIndentLevels(leading: string, unit: "tab" | number): number {
	if (unit === "tab") {
		let levels = 0;
		for (const ch of leading) {
			if (ch === "\t") levels++;
		}
		return levels;
	}
	return Math.floor(leading.length / unit);
}

function buildTree(lines: string[]): TreeNode[] {
	const root: TreeNode[] = [];
	const stack: { node: TreeNode; indent: number }[] = [];
	const unit = detectIndentUnit(lines);

	for (const line of lines) {
		const m = BULLET_RE.exec(line);
		if (!m) continue;
		const indent = countIndentLevels(m[1], unit);
		const content = line.slice(m[0].length);
		const node: TreeNode = { content, children: [] };

		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
			stack.pop();
		}

		if (stack.length === 0) {
			root.push(node);
		} else {
			stack[stack.length - 1].node.children.push(node);
		}
		stack.push({ node, indent });
	}

	return root;
}

function extractPairs(nodes: TreeNode[]): QAPair[] {
	const pairs: QAPair[] = [];

	function findAnswer(children: TreeNode[]): string | null {
		for (const child of children) {
			if (child.content.startsWith("Answer:")) {
				return child.content.slice("Answer:".length).trim();
			}
			const nested = findAnswer(child.children);
			if (nested !== null) return nested;
		}
		return null;
	}

	function walk(node: TreeNode): void {
		if (node.content.startsWith("Question:")) {
			const question = node.content.slice("Question:".length).trim();
			const answer = findAnswer(node.children);
			pairs.push({ question, answer: answer ?? "To do..." });
		}
		for (const child of node.children) {
			walk(child);
		}
	}

	for (const node of nodes) {
		walk(node);
	}
	return pairs;
}

function extractLinesAfterHeading(fullContent: string, heading: string): string[] {
	const lines = fullContent.split("\n");
	let capturing = false;
	const result: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === heading) {
			capturing = true;
			continue;
		}
		if (capturing && /^#{1,6}\s/.test(trimmed)) {
			break;
		}
		if (capturing) {
			result.push(line);
		}
	}

	return result;
}

function parseQAFromNote(fullContent: string): QAPair[] {
	const lines = extractLinesAfterHeading(fullContent, HEADING);
	const tree = buildTree(lines);
	return extractPairs(tree);
}

// ── Rendering ─────────────────────────────────────────────────────────

function renderQA(pairs: QAPair[], container: HTMLElement): void {
	container.addClass(QA_BLOCK_CLASS);
	container.createEl("h1", { text: "Project Overview" });
	container.createEl("h2", { text: "Questions & Answers" });
	if (pairs.length === 0) {
		container.createEl("p", { text: "None..." });
		return;
	}
	for (const pair of pairs) {
		const h = container.createEl("h3", { text: pair.question });
		h.style.marginBottom = "0.25em";
		const p = container.createEl("p", { text: pair.answer });
		p.style.marginTop = "0";
	}
}

// ── Registration ──────────────────────────────────────────────────────

function renderForFile(
	app: App,
	filePath: string,
	containers: Set<HTMLElement>,
): void {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return;
	app.vault.read(file).then((content) => {
		const pairs = parseQAFromNote(content);
		for (const el of containers) {
			if (!el.isConnected) {
				containers.delete(el);
				continue;
			}
			el.empty();
			renderQA(pairs, el);
		}
	});
}

export function registerQABlock(plugin: Plugin): void {
	const app = plugin.app;
	const activeContainers = new Map<string, Set<HTMLElement>>();

	plugin.registerMarkdownCodeBlockProcessor(
		CODE_BLOCK_LANG,
		async (_source, el, ctx) => {
			console.log("[QA] code block processor invoked for", ctx.sourcePath);
			const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			const content = await app.vault.read(file);
			const pairs = parseQAFromNote(content);
			console.log("[QA] parsed", pairs.length, "pairs");
			renderQA(pairs, el);

			let containers = activeContainers.get(ctx.sourcePath);
			if (!containers) {
				containers = new Set();
				activeContainers.set(ctx.sourcePath, containers);
			}
			containers.add(el);
		},
	);

	const refresh = (filePath: string) => {
		const containers = activeContainers.get(filePath);
		if (containers && containers.size > 0) {
			console.log("[QA] refreshing", containers.size, "containers for", filePath);
			renderForFile(app, filePath, containers);
		}
	};

	plugin.registerEvent(
		app.metadataCache.on("changed", (file: TFile) => {
			refresh(file.path);
		}),
	);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	plugin.registerEditorExtension(
		EditorView.updateListener.of((update) => {
			if (!update.docChanged) return;
			console.log("[QA] doc changed, scheduling refresh");
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				const activeView = app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView?.file) {
					refresh(activeView.file.path);
				}
			}, 150);
		}),
	);
}
