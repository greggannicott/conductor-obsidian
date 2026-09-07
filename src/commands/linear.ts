import { App, Notice } from "obsidian";
import { getRelatedTicketId } from "src/projects";

export const openRelatedLinearTicket = (
	app: App,
	linearBaseUrl?: string,
): void => {
	const ticketId = getRelatedTicketId(app);
	if (!ticketId) {
		new Notice("Cannot open a Linear ticket: no jira-id on the task or its parent project");
		return;
	}

	const linearUrl = buildLinearUrl(ticketId, linearBaseUrl);
	window.open(linearUrl, "_blank");
};

export function buildLinearUrl(ticketId: string, linearBaseUrl?: string): string {
	const baseUrl = linearBaseUrl || "https://linear.app/precisely";
	return `${baseUrl}/issue/${ticketId}`;
}