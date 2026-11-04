import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";
import { useConfirm } from "#/components/ConfirmDialog";
import { LibrarySidebar } from "#/components/quizzes/LibrarySidebar";
import { NamingStep } from "#/components/quizzes/NamingStep";
import { QuizRow } from "#/components/quizzes/QuizRow";
import {
	CountPill,
	PageHeading,
	Panel,
	PanelBody,
	PanelHeading,
	WorkspaceGrid,
} from "#/components/ui";
import { readUpload } from "#/lib/parser";
import type { Quiz } from "#/lib/schema";
import {
	appendPending,
	type PendingFile,
	pendingFiles,
	quizzesFromPending,
} from "#/lib/upload";
import { sortedQuizzes, totalAttempts } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/")({ component: QuizList });

function EmptyState() {
	return (
		<p className="leading-[1.7] text-muted">
			No quizzes yet. Use the upload box to add your first Markdown file.
		</p>
	);
}

function QuizPanel({
	quizzes,
	rowFor,
}: {
	quizzes: Quiz[];
	rowFor(quiz: Quiz): ReactNode;
}) {
	return (
		<Panel>
			<PanelHeading title="Your quizzes">
				<CountPill>
					{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}
				</CountPill>
			</PanelHeading>
			<PanelBody>
				{quizzes.length === 0 ? <EmptyState /> : <ul>{quizzes.map(rowFor)}</ul>}
			</PanelBody>
		</Panel>
	);
}

function QuizList() {
	const { state, dispatch, saveOk } = useWorkspace();
	const confirm = useConfirm();
	const [pending, setPending] = useState<PendingFile[] | null>(null);
	const [busy, setBusy] = useState(false);
	// A ref, so a drop during reading is ignored even before busy re-renders.
	const readingRef = useRef(false);

	async function handleFiles(files: File[]) {
		if (files.length === 0 || readingRef.current) return;
		readingRef.current = true;
		setBusy(true);
		try {
			const results = await Promise.all(files.map(readUpload));
			setPending((current) => appendPending(current, pendingFiles(results)));
		} finally {
			readingRef.current = false;
			setBusy(false);
		}
	}

	function addPending() {
		if (!pending) return;
		const quizzes = quizzesFromPending(pending, new Date().toISOString());
		dispatch({ type: "addQuizzes", quizzes });
		setPending(null);
	}

	function renamePending(index: number, name: string) {
		setPending(
			(items) =>
				items?.map((item, i) => (i === index ? { ...item, name } : item)) ??
				null,
		);
	}

	async function resetScores(quiz: Quiz) {
		const ok = await confirm({
			title: "Reset scores?",
			copy: `This clears the score history for "${quiz.name}". This can't be undone.`,
			actionText: "Reset scores",
			cancelText: "Cancel",
		});
		if (ok) dispatch({ type: "resetScores", quizId: quiz.id });
	}

	async function deleteQuiz(quiz: Quiz) {
		const ok = await confirm({
			title: "Delete this quiz?",
			copy: `This removes "${quiz.name}", its score history and any unfinished session. This can't be undone.`,
			actionText: "Delete quiz",
			cancelText: "Cancel",
		});
		if (ok) dispatch({ type: "deleteQuiz", quizId: quiz.id });
	}

	async function resetEverything() {
		const ok = await confirm({
			title: "Reset everything?",
			copy: "This removes every quiz, all score history and every unfinished session in this browser. This can't be undone.",
			actionText: "Reset everything",
			cancelText: "Cancel",
		});
		if (ok) dispatch({ type: "resetEverything" });
	}

	const quizzes = sortedQuizzes(state.quizzes);
	const row = (quiz: Quiz) => (
		<QuizRow
			key={quiz.id}
			quiz={quiz}
			onRename={(name) =>
				dispatch({ type: "renameQuiz", quizId: quiz.id, name })
			}
			onResetScores={() => resetScores(quiz)}
			onDelete={() => deleteQuiz(quiz)}
		/>
	);

	return (
		<>
			<PageHeading
				eyebrow="Your study space"
				title="A fresh set. A sharper you."
				lede="Pick a quiz to practise, or add new ones from your Markdown files."
			/>
			<WorkspaceGrid
				main={
					pending ? (
						<NamingStep
							pending={pending}
							onRename={renamePending}
							onCancel={() => setPending(null)}
							onAdd={addPending}
						/>
					) : (
						<QuizPanel quizzes={quizzes} rowFor={row} />
					)
				}
				aside={
					<LibrarySidebar
						quizCount={state.quizzes.length}
						attemptCount={totalAttempts(state.quizzes)}
						saveOk={saveOk}
						busy={busy}
						onFiles={handleFiles}
						onResetEverything={resetEverything}
					/>
				}
			/>
		</>
	);
}
