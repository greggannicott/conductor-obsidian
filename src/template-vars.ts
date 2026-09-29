import { moment } from "obsidian";

// Matches `{{name}}` and `{{name:FORMAT}}`. The format group is only
// meaningful for the date/time variables, which the engine owns.
const PLACEHOLDER = /\{\{\s*([a-z_][a-z0-9_]*)\s*(?::\s*([^}]*))?\s*\}\}/gi;

// A leading YAML block, captured whole so it can be passed through untouched.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// Obsidian's Templates defaults. We deliberately don't read the core plugin's
// settings, since doing so means reaching into undocumented internals.
const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
const DEFAULT_TIME_FORMAT = "HH:mm";

export type TemplateVars = Record<string, string>;

// Replaces placeholders in `text`. Placeholders with no value are left
// literal, whether the name is unknown or known-but-absent, so a typo reads
// the same as a genuinely missing value.
//
// A multi-line value dropped onto a line that already has text before it
// repeats that text on every line, so `> {{content}}` quotes the whole block
// rather than just its first line. The prefix comes from the original text
// rather than the output-so-far, so a value already expanded by an earlier
// placeholder is never re-prefixed.
export function substituteTemplateVars(
	text: string,
	vars: TemplateVars,
	now: moment.Moment = moment(),
): string {
	return text.replace(
		PLACEHOLDER,
		(
			match: string,
			name: string,
			format: string | undefined,
			offset: number,
			source: string,
		): string => {
			const value = resolveValue(name, format, vars, now);
			if (value === null) return match;
			if (!value.includes("\n")) return value;
			const lineStart = source.lastIndexOf("\n", offset) + 1;
			const prefix = source.slice(lineStart, offset);
			return value.split("\n").join(`\n${prefix}`);
		},
	);
}

// Substitutes into the body only. Frontmatter stays code-owned, so
// `categories`/`type`/`parents` can't be templated - they're written
// explicitly after creation instead.
export function substituteTemplateBody(
	text: string,
	vars: TemplateVars,
	now?: moment.Moment,
): string {
	const frontmatter = FRONTMATTER.exec(text);
	if (!frontmatter) return substituteTemplateVars(text, vars, now);
	return (
		frontmatter[0] +
		substituteTemplateVars(text.slice(frontmatter[0].length), vars, now)
	);
}

function resolveValue(
	name: string,
	format: string | undefined,
	vars: TemplateVars,
	now: moment.Moment,
): string | null {
	if (name === "date" || name === "time") {
		const fallback =
			name === "date" ? DEFAULT_DATE_FORMAT : DEFAULT_TIME_FORMAT;
		return now.format(format?.trim() || fallback);
	}
	// `{{name:FORMAT}}` is a date/time form. A suffix on any other name is a
	// mistake, so leave it literal rather than quietly dropping the suffix.
	if (format !== undefined) return null;
	const value = vars[name];
	return typeof value === "string" ? value : null;
}
