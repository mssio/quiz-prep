import { Button, Panel, SectionLabel } from "#/components/ui";
import { isAnswered } from "#/lib/grading";
import type { Attempt } from "#/lib/schema";

type Props = {
	attempt: Attempt;
	saveOk: boolean;
	onNavigate(index: number): void;
	onFinish(): void;
};

function navigatorLabel(index: number, answered: boolean, flagged: boolean) {
	const state = answered ? "answered" : "unanswered";
	const flag = flagged ? ", flagged" : "";
	return `Question ${index + 1}, ${state}${flag}`;
}

function navigatorClass(current: boolean, answered: boolean) {
	const base =
		"relative h-[39px] min-w-0 rounded-md border text-[13px] border-edge bg-surface text-muted";
	if (current) {
		return `${base} !border-blue !bg-accent !text-on-accent shadow-[0_0_0_3px_var(--color-halo)]`;
	}
	if (answered)
		return `${base} !border-info-border !bg-info-bg !text-info-text`;
	return base;
}

function Legend() {
	return (
		<div className="flex flex-wrap gap-2.5 text-xs text-muted">
			<span className="flex items-center gap-[5px]">
				<i className="h-2.5 w-2.5 rounded-[3px] border border-edge bg-selected-bg" />
				Answered
			</span>
			<span className="flex items-center gap-[5px]">
				<i className="h-2.5 w-2.5 rounded-[3px] border border-edge" />
				Unanswered
			</span>
			<span>⚑ Flagged</span>
		</div>
	);
}

export function QuizSidebar({ attempt, saveOk, onNavigate, onFinish }: Props) {
	const total = attempt.questions.length;
	const questionFor = (id: string) =>
		attempt.questions.find((q) => q.id === id);
	const answeredCount = attempt.questions.filter((q) =>
		isAnswered(q, attempt.responses[q.id]),
	).length;

	return (
		<Panel>
			<div className="p-6 phone:p-[22px] tablet:p-[26px]">
				<SectionLabel>Session overview</SectionLabel>
				<p className="my-3.5 text-sm leading-[1.6] text-muted">
					{answeredCount} of {total} answered
				</p>
				<div className="mt-[17px] h-1.5 overflow-hidden rounded-md bg-track">
					<div
						className="h-full bg-accent"
						style={{ width: `${(100 * answeredCount) / total}%` }}
					/>
				</div>
				<nav
					aria-label="Question navigator"
					className="my-[22px] grid grid-cols-8 gap-2 phone:grid-cols-5"
				>
					{attempt.order.map((id, index) => {
						const question = questionFor(id);
						const answered =
							!!question && isAnswered(question, attempt.responses[id]);
						const flagged = !!attempt.flags[id];
						const current = index === attempt.currentIndex;
						return (
							<button
								key={id}
								type="button"
								aria-label={navigatorLabel(index, answered, flagged)}
								aria-current={current ? "step" : undefined}
								className={navigatorClass(current, answered)}
								onClick={() => onNavigate(index)}
							>
								{index + 1}
								{flagged ? (
									<span
										aria-hidden="true"
										className="absolute -top-[7px] right-px rounded-[3px] bg-warning-bg text-sm text-amber"
									>
										⚑
									</span>
								) : null}
							</button>
						);
					})}
				</nav>
				<Legend />
				<hr className="my-[22px] border-0 border-t border-line" />
				<Button variant="secondary" full onClick={onFinish}>
					Review &amp; finish
				</Button>
				<p className="mt-[15px] text-center text-xs text-muted">
					{saveOk ? "Saved in this browser" : "Not saved — keep this tab open"}
				</p>
			</div>
		</Panel>
	);
}
