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
		"relative h-[39px] min-w-0 rounded-md border text-[13px] border-[#ccd6e4] bg-white text-[#4f6178]";
	if (current) {
		return `${base} !border-blue !bg-blue !text-white shadow-[0_0_0_3px_#dce6fe]`;
	}
	if (answered)
		return `${base} !border-[#c3d4f6] !bg-[#e7eefb] !text-[#2258c6]`;
	return base;
}

function Legend() {
	return (
		<div className="flex flex-wrap gap-2.5 text-xs text-muted">
			<span className="flex items-center gap-[5px]">
				<i className="h-2.5 w-2.5 rounded-[3px] border border-[#c4d0e0] bg-[#ceddf8]" />
				Answered
			</span>
			<span className="flex items-center gap-[5px]">
				<i className="h-2.5 w-2.5 rounded-[3px] border border-[#c4d0e0]" />
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
				<div className="mt-[17px] h-1.5 overflow-hidden rounded-md bg-[#e6edf6]">
					<div
						className="h-full bg-blue"
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
										className="absolute -top-[7px] right-px rounded-[3px] bg-[#fff2cf] text-sm text-amber"
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
