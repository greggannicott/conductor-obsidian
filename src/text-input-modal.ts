import { App, Modal } from "obsidian";

export type TextInputKeybinding = {
	id: string;
	commandText: string;
	check: (e: KeyboardEvent) => boolean;
	instruction: string;
};

export type TextInputModalConfiguration = {
	title: string;
	placeholder?: string;
	keybindings?: TextInputKeybinding[];
};

type SubmitEvent = {
	value: string;
	submitKeybinding: string;
};

export class TextInputModal extends Modal {
	private resolve: (value: SubmitEvent) => void;
	private keybindings: TextInputKeybinding[];

	constructor(
		app: App,
		keybindings: TextInputKeybinding[] = [],
		placeholder?: string,
	) {
		super(app);
		this.keybindings = keybindings;

		const input = this.contentEl.createEl("input", {
			cls: ["text-input", "input"],
		});

		const promptInstructions = this.contentEl.createEl("div", {
			cls: "prompt-instructions",
		});

		for (const kb of this.keybindings) {
			const instructionEl = promptInstructions.createEl("div", {
				cls: "prompt-instuction",
			});
			instructionEl.createEl("span", {
				cls: "prompt-instruction-command",
				text: kb.commandText,
			});
			instructionEl.createEl("span", { text: kb.instruction });
		}

		if (placeholder) {
			input.placeholder = placeholder;
		}

		input.addEventListener("keydown", (e) => {
			for (const kb of this.keybindings) {
				if (kb.check(e)) {
					e.preventDefault();
					this.resolve({
						value: input.value,
						submitKeybinding: kb.id,
					});
					this.close();
					break;
				}
			}
		});
	}

	static show(
		app: App,
		config: TextInputModalConfiguration,
	): Promise<SubmitEvent> {
		const defaultKeybindings: TextInputKeybinding[] = [
			{
				id: "enter",
				commandText: "↵",
				check: (e) => e.key === "Enter",
				instruction: "submit",
			},
		];
		const keybindings = config.keybindings ?? defaultKeybindings;

		return new Promise((resolve) => {
			const modal = new TextInputModal(
				app,
				keybindings,
				config.placeholder,
			);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
