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
	// Optional initial value, pre-selected so typing replaces it.
	value?: string;
	keybindings?: TextInputKeybinding[];
};

type SubmitEvent = {
	value: string;
	submitKeybinding: string;
	// True when the modal was closed without submitting (e.g. Esc).
	cancelled: boolean;
};

export class TextInputModal extends Modal {
	private resolve: (value: SubmitEvent) => void;
	private keybindings: TextInputKeybinding[];
	private input: HTMLInputElement;
	private submitted = false;

	constructor(app: App, config: TextInputModalConfiguration) {
		super(app);

		const defaultKeybindings: TextInputKeybinding[] = [
			{
				id: "enter",
				commandText: "↵",
				check: (e) => e.key === "Enter",
				instruction: "submit",
			},
		];
		this.keybindings = config.keybindings ?? defaultKeybindings;

		this.input = this.contentEl.createEl("input", {
			cls: ["text-input", "input"],
		});

		if (config.value) {
			this.input.value = config.value;
		}

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
			this.input.placeholder = config.placeholder;
		}

		this.input.addEventListener("keydown", (e) => {
			for (const kb of this.keybindings) {
				if (kb.check(e)) {
					e.preventDefault();
					this.submitted = true;
					this.resolve({
						value: this.input.value,
						submitKeybinding: kb.id,
						cancelled: false,
					});
					this.close();
					break;
				}
			}
		});
	}

	onOpen(): void {
		super.onOpen();
		this.input.focus();
		this.input.select();
	}

	onClose(): void {
		// Resolve even when closed without submitting (e.g. Esc) so
		// awaited callers are not left hanging.
		if (!this.submitted) {
			this.resolve({
				value: "",
				submitKeybinding: "cancel",
				cancelled: true,
			});
		}
		super.onClose();
	}

	static show(
		app: App,
		config: TextInputModalConfiguration,
	): Promise<SubmitEvent> {
		return new Promise((resolve) => {
			const modal = new TextInputModal(app, config);
			modal.setTitle(config.title);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
