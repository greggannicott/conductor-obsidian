import { App, Modal, moment } from "obsidian";

const DAYS_HEADER = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export class DatePickerModal extends Modal {
	private resolve: ((value: string | null) => void) | null = null;
	private currentMonth: moment.Moment;
	private selectedDate: moment.Moment;
	private highlightedDate: moment.Moment;
	private handleKeydown: ((e: KeyboardEvent) => void) | null = null;

	constructor(app: App, defaultDate: moment.Moment) {
		super(app);
		this.currentMonth = defaultDate.clone().startOf("month");
		this.selectedDate = defaultDate.clone();
		this.highlightedDate = defaultDate.clone();
	}

	onOpen(): void {
		super.onOpen();
		this.modalEl.addClass("conductor-date-picker-modal");
		this.render();
		this.handleKeydown = (e: KeyboardEvent) => {
			if (e.isComposing) return;

			if (e.key === "Enter") {
				e.preventDefault();
				this.selectDate(this.highlightedDate);
				return;
			}

			if ((e.ctrlKey || e.metaKey) && e.key === "n") {
				e.preventDefault();
				this.moveHighlight(1);
				return;
			}

			if ((e.ctrlKey || e.metaKey) && e.key === "p") {
				e.preventDefault();
				this.moveHighlight(-1);
				return;
			}
		};
		this.scope.register([], "Enter", () => {
			this.selectDate(this.highlightedDate);
		});
		this.scope.register(["Ctrl"], "n", () => {
			this.moveHighlight(1);
		});
		this.scope.register(["Ctrl"], "p", () => {
			this.moveHighlight(-1);
		});
		this.scope.register([], "ArrowRight", () => {
			this.moveHighlight(1);
		});
		this.scope.register([], "ArrowLeft", () => {
			this.moveHighlight(-1);
		});
		this.scope.register([], "ArrowDown", () => {
			this.moveHighlight(7);
		});
		this.scope.register([], "ArrowUp", () => {
			this.moveHighlight(-7);
		});
	}

	onClose(): void {
		if (this.handleKeydown) {
			this.handleKeydown = null;
		}
		super.onClose();
		if (this.resolve) {
			this.resolve(null);
			this.resolve = null;
		}
	}

	private selectDate(date: moment.Moment): void {
		this.selectedDate = date.clone();
		this.resolve?.(this.selectedDate.format("YYYY-MM-DD"));
		this.resolve = null;
		this.close();
	}

	private moveHighlight(deltaDays: number): void {
		this.highlightedDate.add(deltaDays, "days");

		if (
			this.highlightedDate.month() !== this.currentMonth.month() ||
			this.highlightedDate.year() !== this.currentMonth.year()
		) {
			this.currentMonth = this.highlightedDate.clone().startOf("month");
		}

		this.render();
	}

	private render(): void {
		this.contentEl.empty();

		const nav = this.contentEl.createDiv({ cls: "conductor-dp-nav" });

		const prevBtn = nav.createEl("button", { text: "‹" });
		prevBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.currentMonth.subtract(1, "month");
			this.render();
		});

		nav.createSpan({
			text: this.currentMonth.format("MMMM YYYY"),
			cls: "conductor-dp-month-label",
		});

		const nextBtn = nav.createEl("button", { text: "›" });
		nextBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.currentMonth.add(1, "month");
			this.render();
		});

		const grid = this.contentEl.createDiv({ cls: "conductor-dp-grid" });

		for (const day of DAYS_HEADER) {
			grid.createDiv({ text: day, cls: "conductor-dp-day-header" });
		}

		const startOfMonth = this.currentMonth.clone().startOf("month");
		const startDay = startOfMonth.day();
		const daysInMonth = this.currentMonth.daysInMonth();
		const today = moment().startOf("day");

		for (let i = 0; i < startDay; i++) {
			grid.createDiv({ cls: "conductor-dp-day empty" });
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const date = this.currentMonth.clone().date(day);
			const dayEl = grid.createDiv({
				text: String(day),
				cls: "conductor-dp-day",
			});

			if (date.isSame(today, "day")) {
				dayEl.addClass("conductor-dp-today");
			}
			if (date.isSame(this.selectedDate, "day")) {
				dayEl.addClass("conductor-dp-selected");
			}
			if (date.isSame(this.highlightedDate, "day")) {
				dayEl.addClass("conductor-dp-highlighted");
			}

			dayEl.addEventListener("click", (e) => {
				e.preventDefault();
				this.selectDate(date);
			});
		}

		const footer = this.contentEl.createDiv({ cls: "conductor-dp-footer" });
		const todayBtn = footer.createEl("button", {
			text: "Today",
			cls: "conductor-dp-today-btn",
		});
		todayBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.selectDate(moment().startOf("day"));
		});
	}

	static show(app: App, defaultDate?: moment.Moment): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new DatePickerModal(
				app,
				defaultDate ?? moment().subtract(1, "day"),
			);
			modal.resolve = resolve;
			modal.open();
		});
	}
}
