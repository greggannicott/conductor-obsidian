// Minimal client for go-bff. The BFF owns the shared ID counter, so note
// creators ask it for an ID before writing a task or project to the vault.

const DEFAULT_BFF_URL = "http://localhost:8082";

let baseUrl = DEFAULT_BFF_URL;

// Called once on plugin load from the persisted settings.
export function configureBff(url?: string): void {
	const trimmed = (url ?? "").trim().replace(/\/+$/, "");
	baseUrl = trimmed || DEFAULT_BFF_URL;
}

export function getBffUrl(): string {
	return baseUrl;
}

// mintId reserves the next shared ID. Callers should treat any failure as
// fatal for the creation flow so notes are never written without an ID.
export async function mintId(): Promise<string> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl}/pkm/ids`, {
			method: "POST",
			headers: { Accept: "application/json" },
		});
	} catch (error) {
		throw new Error(
			`could not reach the BFF at ${baseUrl}: ${errorMessage(error)}`,
		);
	}

	if (!response.ok) {
		throw new Error(`BFF returned ${response.status} ${response.statusText}`);
	}

	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new Error("BFF returned an invalid response");
	}

	const id = (body as { id?: unknown } | null)?.id;
	if (typeof id !== "string" || !/^gg-\d{5,}$/.test(id)) {
		throw new Error(`BFF returned an invalid ID: ${String(id)}`);
	}
	return id;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
