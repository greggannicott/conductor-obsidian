import { App, Notice, TFile } from "obsidian";
import { getRelatedTicketId, getRelatedTicketIdForFile } from "src/projects";

export const openRelatedLinearTicket = (
	app: App,
	linearBaseUrl?: string,
): void => {
	const activeFile = app.workspace.activeEditor?.file;
	if (activeFile) {
		openRelatedLinearTicketForFile(app, activeFile, linearBaseUrl);
	}
};

export const openRelatedLinearTicketForFile = (
	app: App,
	file: TFile,
	linearBaseUrl?: string,
): void => {
	const ticketId = getRelatedTicketIdForFile(app, file);
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