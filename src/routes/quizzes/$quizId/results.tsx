import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { BackLink } from "#/components/BackLink";
import { ResultHero } from "#/components/results/ResultHero";
import { ReviewList } from "#/components/results/ReviewList";
import { Button, Notice, PageHeading } from "#/components/ui";
import { retryMissed } from "#/lib/attempt";
import { type Summary, summarize } from "#/lib/grading";
import { findQuiz, questionSource, resultsRedirect } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/quizzes/$quizId/results")({
	component: Results,
});

function noticeCopy(s: Summary): string {
	if (s.pending)
		return "Complete self-assessment to finalize your score and retry.";
	if (s.incorrect) return "Give the questions you missed another try.";
	if (s.totalGradable) return "You answered every gradable question correctly.";
	return "Questions without an answer key are excluded from your score.";
}

function Results() {
	const { quizId } = Route.useParams();
	const { state, dispatch } = useWorkspace();
	const quiz = findQuiz(state, quizId);

	if (!quiz) return <Navigate to="/" replace />;
	const { attempt } = quiz;
	const redirect = resultsRedirect(attempt);
	if (redirect === "play") {
		return <Navigate to="/quizzes/$quizId/play" params={{ quizId }} replace />;
	}
	if (redirect === "quiz" || !attempt) {
		return <Navigate to="/quizzes/$quizId" params={{ quizId }} replace />;
	}

	const summary = summarize(attempt);
	const canRetry = summary.incorrect > 0 || summary.pending > 0;

	// Only dispatch. The new active attempt makes the guard above send the
	// learner to play, so there is no navigate() call to race with it.
	function retry() {
		if (!attempt) return;
		const next = retryMissed(attempt);
		if (next) dispatch({ type: "startAttempt", quizId, attempt: next });
	}

	return (
		<>
			<BackLink quizId={quizId} />
			<PageHeading
				eyebrow="REFLECT & REPEAT"
				title="See what stuck."
				lede="Review your answers, close the gaps, and keep moving forward."
			/>
			<ResultHero summary={summary} />
			<div className="mt-[22px]">
				<Notice>
					<span>{noticeCopy(summary)}</span>
					{canRetry && (
						<Button
							variant="primary"
							disabled={summary.pending > 0}
							onClick={retry}
						>
							Retry missed questions
						</Button>
					)}
					<Link
						to="/quizzes/$quizId"
						params={{ quizId }}
						className="inline-flex min-h-11 items-center rounded-lg border border-[#cbd5e3] bg-white px-[18px] py-3 text-sm font-[650] text-[#243b56] no-underline hover:bg-[#f1f5fb]"
					>
						Back to quiz
					</Link>
				</Notice>
			</div>
			<h2 className="text-[19px] font-bold leading-[1.4] tracking-[-0.35px]">
				Your answer review
			</h2>
			<p className="my-3.5 text-sm leading-[1.6] text-muted">
				Open any question to compare your answer with the answer key.
			</p>
			<ReviewList
				attempt={attempt}
				sourceOf={(question) => questionSource(question, state.quizzes)}
				onAssess={(questionId, correct) =>
					dispatch({
						type: "attempt",
						quizId,
						action: { type: "assess", questionId, correct },
					})
				}
			/>
		</>
	);
}
