import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BackLink } from "#/components/BackLink";
import { ResultHero } from "#/components/results/ResultHero";
import { ReviewList } from "#/components/results/ReviewList";
import { PageHeading } from "#/components/ui";
import { summarize } from "#/lib/grading";
import { formatSessionDate, sessionView } from "#/lib/history";
import { findQuiz, questionSource } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/quizzes/$quizId/sessions/$sessionId")({
	component: PastSession,
});

function PastSession() {
	const { quizId, sessionId } = Route.useParams();
	const { state } = useWorkspace();
	const quiz = findQuiz(state, quizId);

	if (!quiz) return <Navigate to="/" replace />;
	const found = sessionView(quiz, sessionId);
	if (!found) {
		return <Navigate to="/quizzes/$quizId" params={{ quizId }} replace />;
	}
	const { entry, view } = found;
	const when = formatSessionDate(entry.submittedAt);

	return (
		<>
			<BackLink quizId={quizId} />
			<PageHeading
				eyebrow="PAST SESSION"
				title={entry.isRetry ? `Retry from ${when}` : `Session from ${when}`}
				lede="Your saved answers, next to the answer key."
			/>
			<ResultHero summary={summarize(view)} />
			<ReviewList
				view={view}
				readOnly
				sourceOf={(question) => questionSource(question, state.quizzes)}
			/>
		</>
	);
}
