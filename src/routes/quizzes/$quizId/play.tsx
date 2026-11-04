import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BackLink } from "#/components/BackLink";
import { useConfirm } from "#/components/ConfirmDialog";
import { QuizSidebar } from "#/components/QuizSidebar";
import { QuestionView } from "#/components/questions/QuestionView";
import {
	Button,
	PageHeading,
	Panel,
	PanelBody,
	WorkspaceGrid,
} from "#/components/ui";
import { useFocusMain } from "#/components/useFocusMain";
import type { AttemptAction } from "#/lib/attempt";
import { formatNames } from "#/lib/formats";
import type { Attempt } from "#/lib/schema";
import { finishCopy } from "#/lib/session";
import { storageStatus } from "#/lib/storage";
import { findQuiz, playRedirect, questionSource } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/quizzes/$quizId/play")({
	component: PlayScreen,
});

function PlayScreen() {
	const { quizId } = Route.useParams();
	const { state, dispatch, saveOk } = useWorkspace();
	const confirm = useConfirm();
	const focusMain = useFocusMain();
	const quiz = findQuiz(state, quizId);

	if (!quiz) return <Navigate to="/" replace />;
	const { attempt } = quiz;
	const redirect = playRedirect(attempt);
	if (redirect === "results") {
		return (
			<Navigate to="/quizzes/$quizId/results" params={{ quizId }} replace />
		);
	}
	if (redirect === "quiz" || !attempt) {
		return <Navigate to="/quizzes/$quizId" params={{ quizId }} replace />;
	}
	const active: Attempt = attempt;
	const question = attempt.questions.find(
		(q) => q.id === attempt.order[attempt.currentIndex],
	);
	if (!question) return <Navigate to="/" replace />;

	const isLast = attempt.currentIndex === attempt.order.length - 1;
	const flagged = !!attempt.flags[question.id];

	function send(action: AttemptAction) {
		dispatch({ type: "attempt", quizId, action });
	}

	function goTo(index: number) {
		send({ type: "navigate", index });
		focusMain();
	}

	async function finish() {
		const confirmed = await confirm({
			title: "Finish this quiz?",
			copy: finishCopy(active),
			actionText: "Finish quiz",
		});
		if (!confirmed) return;
		// The guard above redirects a submitted attempt to results.
		send({ type: "submit", at: new Date().toISOString() });
	}

	return (
		<>
			<BackLink quizId={quizId} />
			<PageHeading
				eyebrow="STUDY SESSION"
				title={`Question ${attempt.currentIndex + 1} of ${attempt.questions.length}`}
				lede={storageStatus(saveOk).session}
			/>
			<WorkspaceGrid
				main={
					<Panel>
						<PanelBody>
							<div className="flex items-start justify-between gap-3 phone:items-center">
								<span className="rounded-md bg-[#edf2fa] px-[9px] py-1.5 text-xs font-[650] text-[#415876]">
									{formatNames[question.format]}
								</span>
								<Button
									variant="secondary"
									aria-pressed={flagged}
									className={
										flagged
											? "!border-[#d9b861] !bg-[#fff1cf] !text-[#774d0b]"
											: ""
									}
									onClick={() =>
										send({ type: "flag", questionId: question.id })
									}
								>
									{flagged ? "⚑ Flagged for review" : "⚐ Flag for review"}
								</Button>
							</div>
							<p className="mt-[15px] mb-5 text-[13px] [overflow-wrap:anywhere] text-muted">
								{questionSource(question, state.quizzes)} · Q{question.number}
							</p>
							<QuestionView
								key={question.id}
								question={question}
								response={attempt.responses[question.id]}
								displayOrder={attempt.displayOrders[question.id]}
								onAnswer={(response) =>
									send({ type: "answer", questionId: question.id, response })
								}
							/>
						</PanelBody>
						<div className="flex justify-between gap-3 border-t border-line bg-[#fbfcfe] p-[18px] phone:px-7 phone:py-[21px]">
							<Button
								variant="secondary"
								disabled={attempt.currentIndex === 0}
								onClick={() => goTo(attempt.currentIndex - 1)}
							>
								Previous
							</Button>
							<Button
								variant="primary"
								onClick={isLast ? finish : () => goTo(attempt.currentIndex + 1)}
							>
								{isLast ? "Review & finish" : "Next question"}
							</Button>
						</div>
					</Panel>
				}
				aside={
					<QuizSidebar
						attempt={attempt}
						saveOk={saveOk}
						onNavigate={goTo}
						onFinish={finish}
					/>
				}
			/>
		</>
	);
}
