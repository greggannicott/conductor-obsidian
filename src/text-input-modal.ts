import { App, Modal } from "obsidian";

export type TextInputModalConfiguration = {
	title: string;
	placeholder?: string;
};

export const enum ConfirmationKeybinding {
	Enter,
	ShiftEnter,
}

type SubmitEvent = {
	value: string;
	submitKeybinding: ConfirmationKeybinding;
};

export class TextInputModal extends Modal {
	private resolve: (value: SubmitEvent) => void;
	private placeholder: string;

	constructor(app: App) {
		super(app);

		const input = this.contentEl.createEl("input", {
			cls: ["text-input", "input"],
		});

		if (this.placeholder) {
			input.placeholder = this.placeholder;
		}

		input.addEventListener("keydown", (e) => {
			if (e.shiftKey && e.key === "Enter") {
				e.preventDefault();
				this.resolve({
					value: input.value,
					submitKeybinding: ConfirmationKeybinding.ShiftEnter,
				});
				this.close();
			} else if (e.key == "Enter") {
				e.preventDefault();
				this.resolve({
					value: input.value,
					submitKeybinding: ConfirmationKeybinding.Enter,
				});
				this.close();
			}
		});
	}

	static show(
		app: App,
		config: TextInputModalConfiguration,
	): Promise<SubmitEvent> {
		return new Promise((resolve) => {
			const modal = new TextInputModal(app);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
