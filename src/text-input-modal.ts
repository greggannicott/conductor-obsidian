import { App, Modal } from "obsidian";

export type TextInputModalConfiguration = {
	title: string;
	placeholder?: string;
};

export class TextInputModal extends Modal {
	private resolve: (value: string) => void;
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
			if (e.key == "Enter") {
				this.resolve(input.value);
				this.close();
			}
		});
	}

	static show(
		app: App,
		config: TextInputModalConfiguration,
	): Promise<string> {
		return new Promise((resolve) => {
			const modal = new TextInputModal(app);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
