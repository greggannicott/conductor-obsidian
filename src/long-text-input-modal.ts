import { App, Modal } from "obsidian";

export type LongTextInputKeybinding = {
	id: string;
	commandText: string;
	check: (e: KeyboardEvent) => boolean;
	instruction: string;
};

export type LongTextInputModalConfiguration = {
	title: string;
	placeholder?: string;
	keybindings?: LongTextInputKeybinding[];
};

type SubmitEvent = {
	value: string;
	submitKeybinding: string;
};

export class LongTextInputModal extends Modal {
	private resolve: (value: SubmitEvent) => void;
	private keybindings: LongTextInputKeybinding[];

	constructor(app: App, config: LongTextInputModalConfiguration) {
		super(app);

		const defaultKeybindings: LongTextInputKeybinding[] = [
			{
				id: "meta-enter",
				commandText: "⌘+↵",
				check: (e) => e.metaKey && e.key === "Enter",
				instruction: "submit",
			},
		];
		this.keybindings = config.keybindings ?? defaultKeybindings;

		const textarea = this.contentEl.createEl("textarea", {
			cls: ["text-input", "input"],
		});

		textarea.style.width = "100%";
		textarea.style.minHeight = "200px";
		textarea.style.resize = "vertical";

		const promptInstructions = this.contentEl.createEl("div", {
			cls: "prompt-instructions",
		});

		for (const kb of this.keybindings) {
			const instructionEl = promptInstructions.createEl("div", {
				cls: "prompt-instruction",
			});
			instructionEl.createEl("span", {
				cls: "prompt-instruction-command",
				text: kb.commandText,
			});
			instructionEl.createEl("span", { text: kb.instruction });
		}

		if (config.placeholder) {
			textarea.placeholder = config.placeholder;
		}

		textarea.addEventListener("keydown", (e) => {
			for (const kb of this.keybindings) {
				if (kb.check(e)) {
					e.preventDefault();
					this.resolve({
						value: textarea.value,
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
		config: LongTextInputModalConfiguration,
	): Promise<SubmitEvent> {
		return new Promise((resolve) => {
			const modal = new LongTextInputModal(app, config);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
