import { App, Modal, Setting } from "obsidian";

export class TextInputModal extends Modal {
	private resolve: (value: string) => void;

	constructor(app: App) {
		super(app);

		let name = "";
		new Setting(this.contentEl).setName("Name").addText((text) =>
			text.onChange((value) => {
				name = value;
			}),
		);

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.resolve(name);
					this.close();
				}),
		);
	}

	static show(app: App, title: string): Promise<string> {
		return new Promise((resolve) => {
			const modal = new TextInputModal(app);
			modal.setTitle(title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
