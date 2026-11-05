import { useState } from "react";
import { Button, Panel, SectionLabel, SummaryRow } from "#/components/ui";
import type { Quiz } from "#/lib/schema";
import { orderLabel, parseCount } from "#/lib/session";
import { storageStatus } from "#/lib/storage";

type Props = {
	quiz: Quiz;
	saveOk: boolean;
	onStart(count: number, keepOrder: boolean): void;
};

export function SessionPanel({ quiz, saveOk, onStart }: Props) {
	const total = quiz.questions.length;
	const [text, setText] = useState(String(total));
	const [keepOrder, setKeepOrder] = useState(false);
	const count = parseCount(text, total);
	const invalid = count === null;
	const status = storageStatus(saveOk);

	return (
		<Panel>
			<div className="p-6 phone:p-[22px] tablet:p-[26px]">
				<SectionLabel>Your next session</SectionLabel>
				<div className="mt-3 flex items-baseline gap-2">
					<strong className="text-5xl font-[650] tracking-[-2px]">
						{total}
					</strong>
					<span className="text-muted">questions ready</span>
				</div>
				<hr className="my-4 border-line" />
				<label
					htmlFor="session-count"
					className="mb-2 block text-sm font-semibold"
				>
					Number of questions
				</label>
				<input
					id="session-count"
					type="number"
					min={1}
					max={total}
					step={1}
					value={text}
					aria-invalid={invalid}
					aria-describedby="session-count-error"
					onChange={(event) => setText(event.target.value)}
					className="mb-2 min-h-11 w-full rounded-lg border border-field bg-surface px-3 text-[15px]"
				/>
				<p
					id="session-count-error"
					className="mb-3 min-h-5 text-xs text-danger-text"
				>
					{invalid ? `Choose a whole number from 1 to ${total}.` : ""}
				</p>
				<label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold">
					<input
						type="checkbox"
						checked={keepOrder}
						aria-describedby="session-order-note"
						onChange={(event) => setKeepOrder(event.target.checked)}
						className="size-4"
					/>
					Keep original order
				</label>
				<p id="session-order-note" className="mb-4 text-xs text-muted">
					Ordering questions stay shuffled, because their file order may show
					the answer.
				</p>
				<SummaryRow label="Question order" value={orderLabel(keepOrder)} />
				<SummaryRow label="Answer choices" value={orderLabel(keepOrder)} />
				<SummaryRow label="Progress" value={status.library} />
				<hr className="my-4 border-line" />
				<Button
					variant="primary"
					full
					disabled={invalid}
					onClick={() => count !== null && onStart(count, keepOrder)}
				>
					Start quiz
				</Button>
				<p className="mt-3 text-center text-xs text-muted">{status.note}</p>
			</div>
		</Panel>
	);
}
