// Shared naming convention for Project Notes. Both the create command and the
// backend (gg-bff) produce filenames of the form "Project Note - {name}.md",
// so callers should pass only the bare name; these helpers make that contract
// explicit and keep the two sides from drifting.

export const PROJECT_NOTE_NAME_PREFIX = "Project Note - ";

const KNOWN_PREFIXES = ["Project Note - ", "project-note - "];

// Strips a leading known prefix (if present) and trims surrounding whitespace,
// returning the bare note name. Safe to call on already-bare names.
export function stripProjectNotePrefix(name: string): string {
	const lower = name.toLowerCase();
	for (const prefix of KNOWN_PREFIXES) {
		if (lower.startsWith(prefix.toLowerCase())) {
			return name.slice(prefix.length).trim();
		}
	}
	return name.trim();
}

// A bare, prefix-free title suitable for template variables and filenames.
export function normalizeProjectNoteTitle(name: string): string {
	return stripProjectNotePrefix(name);
}

// Builds the full filename (without extension) for a note from a (possibly
// prefixed) input name.
export function formatProjectNoteName(name: string): string {
	const bare = stripProjectNotePrefix(name);
	return bare ? `${PROJECT_NOTE_NAME_PREFIX}${bare}` : "";
}