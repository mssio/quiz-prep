import { useState } from "react";
import { MathText } from "#/components/MathText";
import { Assessment } from "#/components/results/Assessment";
import { OptionList } from "#/components/results/OptionList";
import { answerText } from "#/lib/answer-text";
import { formatNames } from "#/lib/formats";
import { type GradeStatus, gradeQuestion } from "#/lib/grading";
import type { SessionView } from "#/lib/history";
import type { Question } from "#/lib/schema";

type Props = {
	question: Question;
	index: number;
	view: SessionView;
	sourceName: string;
	readOnly?: boolean;
	onAssess?(correct: boolean): void;
};

const STATUS_LABEL: Record<GradeStatus, string> = {
	correct: "Correct",
	incorrect: "Incorrect",
	pending: "Assess",
	ungraded: "Unscored",
};

const STATUS_STYLE: Record<GradeStatus, string> = {
	correct: "bg-success-bg text-green",
	incorrect: "bg-danger-bg text-danger-text",
	pending: "bg-warning-bg text-amber",
	ungraded: "bg-neutral-bg text-muted",
};

const ANSWER_BOX =
	"mt-2 mb-5 rounded-[7px] bg-sunken p-3.5 leading-[1.65] [overflow-wrap:anywhere] whitespace-pre-wrap";

function Label({ children }: { children: string }) {
	return <span className="text-[13px] font-[650]">{children}</span>;
}

// What the learner typed is shown exactly as typed. Everything else may hold math.
function typedByLearner(q: Question): boolean {
	return q.format === "short-answer" || q.format === "fill-in-blank";
}

function canAssess(q: Question, response: unknown): boolean {
	return (
		q.format === "short-answer" &&
		q.answer !== null &&
		typeof response === "string" &&
		response.trim() !== ""
	);
}

export function ReviewItem({
	question,
	index,
	view,
	sourceName,
	readOnly = false,
	onAssess,
}: Props) {
	const response = view.responses[question.id];
	const assessed = view.assessments[question.id];
	const grade = gradeQuestion(question, response, assessed);
	const [open, setOpen] = useState(readOnly || grade.status === "pending");
	const flag = view.flags[question.id] ? " · ⚑ Flagged" : "";
	const mine = answerText(question, response);
	const keyLabel =
		question.format === "short-answer" ? "Model answer" : "Correct answer";

	return (
		<details
			open={open}
			onToggle={(event) => setOpen(event.currentTarget.open)}
			className="group mb-[13px] overflow-hidden rounded-xl border border-line bg-surface"
		>
			<summary className="flex cursor-pointer list-none items-start gap-[9px] p-4 phone:gap-3.5 phone:p-5">
				<span
					className={`rounded-[5px] px-[9px] py-1.5 text-xs ${STATUS_STYLE[grade.status]}`}
				>
					{STATUS_LABEL[grade.status]}
				</span>
				<div className="min-w-0">
					<span className="text-sm text-muted">
						{index + 1} · {formatNames[question.format]}
						{flag}
					</span>
					<h3 className="my-[3px] text-base font-bold leading-[1.6] [overflow-wrap:anywhere] whitespace-pre-wrap">
						<MathText text={question.prompt} />
					</h3>
				</div>
				<span className="ml-auto text-xl text-muted group-open:hidden">+</span>
				<span className="ml-auto hidden text-xl text-muted group-open:inline">
					−
				</span>
			</summary>
			<div className="border-t border-line p-[22px]">
				<p className="mb-5 text-[13px] [overflow-wrap:anywhere] text-muted">
					{sourceName} · Q{question.number}
				</p>
				<OptionList question={question} response={response} />
				<Label>Your answer</Label>
				<div className={ANSWER_BOX}>
					{typedByLearner(question) ? mine : <MathText text={mine} />}
				</div>
				<Label>{keyLabel}</Label>
				<div className={ANSWER_BOX}>
					<MathText text={answerText(question, question.answer, true)} />
				</div>
				{question.explanation && (
					<>
						<Label>Explanation</Label>
						<div className={ANSWER_BOX}>
							<MathText text={question.explanation} />
						</div>
					</>
				)}
				{!readOnly && onAssess && canAssess(question, response) && (
					<Assessment assessed={assessed} onAssess={onAssess} />
				)}
			</div>
		</details>
	);
}
