import { App } from "obsidian";
import { getActiveProjectJiraId } from "src/projects";

export const openParentProjectJiraTicket = (
	app: App,
	jiraBaseUrl?: string,
): void => {
	const jiraId = getActiveProjectJiraId(app);
	if (!jiraId) return;

	const jiraUrl = buildJiraUrl(jiraId, jiraBaseUrl);
	window.open(jiraUrl, "_blank");
};

export const copyParentProjectJiraId = (app: App): void => {
	const jiraId = getActiveProjectJiraId(app);
	if (!jiraId) return;

	navigator.clipboard.writeText(jiraId);
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
