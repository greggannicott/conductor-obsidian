import { App, Notice } from "obsidian";
import { getActiveTask } from "src/tasks";
import { getActiveProject } from "src/projects";

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

// Find the ticket to open: the active task's jira-id if present,
// otherwise the parent project's jira-id.
function getRelatedTicketId(app: App): string | null {
	const activeTask = getActiveTask(app);
	if (activeTask?.jiraId) {
		return activeTask.jiraId;
	}
	const activeProject = getActiveProject(app);
	if (activeProject?.jiraId) {
		return activeProject.jiraId;
	}
	return null;
}

function buildLinearUrl(ticketId: string, linearBaseUrl?: string): string {
	const baseUrl = linearBaseUrl || "https://linear.app/precisely";
	return `${baseUrl}/issue/${ticketId}`;
}