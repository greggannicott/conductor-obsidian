import { App } from "obsidian";
import { getActiveProjectJiraId, getRelatedTicketId } from "src/projects";

export const openParentProjectJiraTicket = (
	app: App,
	jiraBaseUrl?: string,
): void => {
	const jiraId = getActiveProjectJiraId(app);
	if (!jiraId) return;

	const jiraUrl = buildJiraUrl(jiraId, jiraBaseUrl);
	window.open(jiraUrl, "_blank");
};

export const copyRelatedLinearId = (app: App): void => {
	const ticketId = getRelatedTicketId(app);
	if (!ticketId) return;

	navigator.clipboard.writeText(ticketId);
};

export const copyParentProjectJiraURL = (
	app: App,
	jiraBaseUrl?: string,
): void => {
	const jiraId = getActiveProjectJiraId(app);
	if (!jiraId) return;

	const jiraUrl = buildJiraUrl(jiraId, jiraBaseUrl);
	navigator.clipboard.writeText(jiraUrl);
};

function buildJiraUrl(
	jiraId: string,
	jiraBaseUrl?: string,
): string {
	const baseUrl = jiraBaseUrl || "https://jira.syncsort.com";
	return `${baseUrl}/browse/${jiraId}`;
}
