import { App, Modal } from "obsidian";

type ZoneTimesSubmitEvent = {
	values: string[];
	cancelled: boolean;
};

const ZONE_COUNT = 5;

export class ZoneTimesModal extends Modal {
	private resolve: (value: ZoneTimesSubmitEvent) => void;
	private inputs: HTMLInputElement[] = [];
	private submitted = false;

	constructor(app: App) {
		super(app);
		this.modalEl.addClass("zone-times-modal");
	}

	onOpen(): void {
		super.onOpen();

		const rows = createDiv({ cls: "zone-times-rows" });
		this.contentEl.append(rows);

		for (let i = 0; i < ZONE_COUNT; i++) {
			const row = rows.createDiv({ cls: "zone-times-row" });
			const label = row.createSpan({
				cls: "zone-times-label",
				text: `Time In Zone ${i + 1}`,
			});

			const input = row.createEl("input", {
				cls: ["text-input", "input"],
				attr: { type: "text" },
			});
			input.placeholder = "MM:SS or 0";
			this.inputs.push(input);

			input.addEventListener("keydown", (e) => {
				const keyEvent = e as KeyboardEvent;

				if (keyEvent.key === "Tab") {
					keyEvent.preventDefault();
					const index = this.inputs.indexOf(input);
					const delta = keyEvent.shiftKey ? -1 : 1;
					const next = this.inputs[index + delta];
					if (next) {
						next.focus();
						next.select();
					}
					return;
				}

				if (keyEvent.key === "Enter") {
					keyEvent.preventDefault();
					this.submitted = true;
					this.resolve({
						values: this.inputs.map((el) => el.value),
						cancelled: false,
					});
					this.close();
					return;
				}

				if (keyEvent.key === "Escape") {
					keyEvent.preventDefault();
					this.close();
				}
			});
		}

		const instructions = this.contentEl.createEl("div", {
			cls: "prompt-instructions",
		});

		const tabInstruction = instructions.createEl("div", {
			cls: "prompt-instruction",
		});
		tabInstruction.createEl("span", {
			cls: "prompt-instruction-command",
			text: "Tab",
		});
		tabInstruction.createEl("span", { text: "next" });

		const submitInstruction = instructions.createEl("div", {
			cls: "prompt-instruction",
		});
		submitInstruction.createEl("span", {
			cls: "prompt-instruction-command",
			text: "↵",
		});
		submitInstruction.createEl("span", { text: "submit" });

		const hint = this.contentEl.createEl("div", {
			cls: "zone-times-hint",
			text: "Enter 0 for zones with no time",
		});

		this.inputs[0].focus();
		this.inputs[0].select();
	}

	onClose(): void {
		if (!this.submitted) {
			this.resolve({
				values: [],
				cancelled: true,
			});
		}
		super.onClose();
	}

	static show(app: App): Promise<ZoneTimesSubmitEvent> {
		return new Promise((resolve) => {
			const modal = new ZoneTimesModal(app);
			modal.setTitle("Time In Zones");
			modal.resolve = resolve;
			modal.open();
		});
	}
}