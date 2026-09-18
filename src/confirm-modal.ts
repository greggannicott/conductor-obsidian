import { App, ButtonComponent, Modal } from "obsidian";

export type ConfirmModalOptions = {
	title: string;
	message: string;
	// Text for the button that proceeds with the action.
	confirmLabel?: string;
};

export class ConfirmModal extends Modal {
	private resolve: ((confirmed: boolean) => void) | null = null;

	constructor(app: App, private options: ConfirmModalOptions) {
		super(app);
		this.setTitle(options.title);
		this.contentEl.createEl("p", { text: options.message });

		const buttonRow = this.contentEl.createDiv({
			cls: "modal-button-container",
		});

		new ButtonComponent(buttonRow)
			.setButtonText("No")
			.setCta()
			.onClick(() => this.finish(false));

		new ButtonComponent(buttonRow)
			.setButtonText(options.confirmLabel ?? "Continue")
			.onClick(() => this.finish(true));
	}

	onClose(): void {
		super.onClose();
		if (this.resolve) {
			this.resolve(false);
			this.resolve = null;
		}
	}

	private finish(confirmed: boolean): void {
		this.resolve?.(confirmed);
		this.resolve = null;
		this.close();
	}

	// Opens the modal a tick later so it can't swallow key events left over
	// from the previously-open modal (e.g. the Enter that confirmed the date
	// picker). Dismissing (Esc) resolves false, so "No" is the default.
	static show(app: App, options: ConfirmModalOptions): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new ConfirmModal(app, options);
			setTimeout(() => {
				modal.resolve = resolve;
				modal.open();
			}, 60);
		});
	}
}