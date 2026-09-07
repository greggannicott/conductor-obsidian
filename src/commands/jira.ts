import { App } from "obsidian";
import { getRelatedTicketId } from "src/projects";
import { buildLinearUrl } from "./linear";

export const copyRelatedLinearId = (app: App): void => {
	const ticketId = getRelatedTicketId(app);
	if (!ticketId) return;

	navigator.clipboard.writeText(ticketId);
};

export const copyRelatedLinearURL = (
	app: App,
	linearBaseUrl?: string,
): void => {
	const ticketId = getRelatedTicketId(app);
	if (!ticketId) return;

	const linearUrl = buildLinearUrl(ticketId, linearBaseUrl);
	navigator.clipboard.writeText(linearUrl);
};
