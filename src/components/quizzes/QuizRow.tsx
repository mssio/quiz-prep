import { Link } from "@tanstack/react-router";
import { type KeyboardEvent, useRef, useState } from "react";
import { QuizStatsBlock } from "#/components/quizzes/QuizStatsBlock";
import { quizStats } from "#/lib/history";
import type { Quiz } from "#/lib/schema";
import { isValidName, type QuizStatus, quizStatus } from "#/lib/workspace";

type Props = {
	quiz: Quiz;
	onRename(name: string): void;
	onResetScores(): void;
	onDelete(): void;
};

const LINK_BUTTON =
	"inline-flex min-h-11 items-center justify-center rounded-lg bg-blue px-[18px] py-3 text-sm font-[650] text-white no-underline hover:bg-[#1645b0]";
const ICON_BUTTON =
	"min-h-11 rounded-md px-2.5 py-2 text-[13px] font-semibold text-muted hover:bg-[#f2f4f8]";

function StartLink({ quizId, status }: { quizId: string; status: QuizStatus }) {
	const params = { quizId };
	if (status === "active") {
		return (
			<Link to="/quizzes/$quizId/play" params={params} className={LINK_BUTTON}>
				Resume
			</Link>
		);
	}
	if (status === "pending") {
		return (
			<Link
				to="/quizzes/$quizId/results"
				params={params}
				className={LINK_BUTTON}
			>
				Finish assessing
			</Link>
		);
	}
	return (
		<Link to="/quizzes/$quizId" params={params} className={LINK_BUTTON}>
			Start
		</Link>
	);
}

function RenameInput({
	current,
	onSave,
	onCancel,
}: {
	current: string;
	onSave(name: string): void;
	onCancel(): void;
}) {
	const [draft, setDraft] = useState(current);
	const [refused, setRefused] = useState(false);
	const finished = useRef(false);

	function finish(action: () => void) {
		if (finished.current) return;
		finished.current = true;
		action();
	}

	function save() {
		if (!isValidName(draft)) {
			setRefused(true);
			return false;
		}
		finish(() => onSave(draft.trim()));
		return true;
	}

	function handleKey(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			event.preventDefault();
			save();
		}
		if (event.key === "Escape") finish(onCancel);
	}

	function handleBlur() {
		if (!save()) finish(onCancel);
	}

	return (
		<div>
			<input
				// biome-ignore lint/a11y/noAutofocus: the input appears when the learner asks to rename
				autoFocus
				aria-label="Quiz name"
				aria-invalid={refused}
				className="min-h-11 w-full rounded-lg border border-[#b7c5d8] bg-white px-3 text-[15px] font-bold text-navy"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={handleKey}
				onBlur={handleBlur}
			/>
			{refused && (
				<p role="alert" className="mt-1 text-xs text-[#a33b31]">
					A quiz needs a name.
				</p>
			)}
		</div>
	);
}

function QuizName({ quiz }: { quiz: Quiz }) {
	return (
		<Link
			to="/quizzes/$quizId"
			params={{ quizId: quiz.id }}
			className="block text-[15px] font-bold [overflow-wrap:anywhere] text-navy no-underline hover:underline"
		>
			{quiz.name}
		</Link>
	);
}

export function QuizRow({ quiz, onRename, onResetScores, onDelete }: Props) {
	const [renaming, setRenaming] = useState(false);
	const detail = `${quiz.questions.length} questions · ${quiz.course || quiz.filename}`;

	return (
		<li className="flex flex-wrap items-center gap-4 border-t border-line py-[18px] first:border-t-0 first:pt-0">
			<span className="rounded-lg bg-[#eef3fc] p-2.5 text-xs font-[750] text-[#3d5c8c]">
				MD
			</span>
			<div className="min-w-[160px] flex-1">
				{renaming ? (
					<RenameInput
						current={quiz.name}
						onSave={(name) => {
							onRename(name);
							setRenaming(false);
						}}
						onCancel={() => setRenaming(false)}
					/>
				) : (
					<QuizName quiz={quiz} />
				)}
				<span className="text-[13px] leading-[1.6] text-muted">{detail}</span>
			</div>
			<QuizStatsBlock stats={quizStats(quiz.history)} />
			<div className="flex flex-wrap items-center gap-1.5">
				<StartLink quizId={quiz.id} status={quizStatus(quiz)} />
				<button
					type="button"
					className={ICON_BUTTON}
					onClick={() => setRenaming(true)}
				>
					Rename
				</button>
				<button type="button" className={ICON_BUTTON} onClick={onResetScores}>
					Reset scores
				</button>
				<button
					type="button"
					className={`${ICON_BUTTON} text-[#a33b31]`}
					onClick={onDelete}
				>
					Delete
				</button>
			</div>
		</li>
	);
}
