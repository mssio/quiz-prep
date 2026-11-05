import {
	createFileRoute,
	Link,
	Navigate,
	useNavigate,
} from "@tanstack/react-router";
import { useConfirm } from "#/components/ConfirmDialog";
import { HistoryTable } from "#/components/quizzes/HistoryTable";
import { QuizStatsBlock } from "#/components/quizzes/QuizStatsBlock";
import { SessionPanel } from "#/components/quizzes/SessionPanel";
import { useResetScores } from "#/components/quizzes/useResetScores";
import {
	Button,
	Notice,
	PageHeading,
	Panel,
	PanelBody,
	PanelHeading,
	WorkspaceGrid,
} from "#/components/ui";
import { createAttempt } from "#/lib/attempt";
import { countLabel } from "#/lib/formats";
import { quizStats } from "#/lib/history";
import type { Quiz } from "#/lib/schema";
import { replaceCopy } from "#/lib/session";
import { findQuiz, type QuizStatus, quizStatus } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/quizzes/$quizId/")({
	component: QuizPage,
});

const LINK_BUTTON =
	"inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-[18px] py-3 text-sm font-[650] text-on-accent no-underline hover:bg-accent-hover";

function UnfinishedNotice({
	quizId,
	status,
}: {
	quizId: string;
	status: QuizStatus;
}) {
	const params = { quizId };
	if (status === "active") {
		return (
			<Notice>
				<span>
					You have an unfinished session. Starting a new one replaces it.
				</span>
				<Link
					to="/quizzes/$quizId/play"
					params={params}
					className={LINK_BUTTON}
				>
					Resume
				</Link>
			</Notice>
		);
	}
	if (status === "pending") {
		return (
			<Notice>
				<span>
					Your last attempt is waiting for self-assessment. Starting a new
					session replaces it.
				</span>
				<Link
					to="/quizzes/$quizId/results"
					params={params}
					className={LINK_BUTTON}
				>
					Finish assessing
				</Link>
			</Notice>
		);
	}
	return null;
}

function HistoryPanel({ quiz, onReset }: { quiz: Quiz; onReset(): void }) {
	return (
		<Panel>
			<PanelHeading title="Score history">
				<Button variant="text" onClick={onReset}>
					Reset scores
				</Button>
			</PanelHeading>
			<PanelBody>
				<QuizStatsBlock stats={quizStats(quiz.history)} />
				<hr className="my-6 border-line" />
				<HistoryTable
					history={quiz.history}
					reviewLink={(entry) => (
						<Link
							to="/quizzes/$quizId/sessions/$sessionId"
							params={{ quizId: quiz.id, sessionId: entry.id }}
							className="-my-2 inline-flex min-h-11 items-center px-2 text-sm font-[650]"
						>
							Review
						</Link>
					)}
				/>
				<p className="mt-4 text-[13px] text-muted">
					Retries are shown but not counted in Best or Average.
				</p>
			</PanelBody>
		</Panel>
	);
}

function QuizPage() {
	const { quizId } = Route.useParams();
	const { state, dispatch, saveOk } = useWorkspace();
	const confirm = useConfirm();
	const resetScores = useResetScores();
	const navigate = useNavigate();
	const quiz = findQuiz(state, quizId);

	if (!quiz) return <Navigate to="/" replace />;
	const status = quizStatus(quiz);
	const course = quiz.course || quiz.filename;

	async function start(count: number, keepOrder: boolean) {
		if (!quiz) return;
		if (status === "active" || status === "pending") {
			const ok = await confirm({
				title: "Start a new attempt?",
				copy: replaceCopy(status === "pending"),
				actionText: "Start new attempt",
			});
			if (!ok) return;
		}
		const attempt = createAttempt(quiz.questions, Math.random, count, {
			keepOrder,
		});
		// Dispatch first, so the play route's guard finds the new attempt.
		dispatch({ type: "startAttempt", quizId, attempt });
		navigate({ to: "/quizzes/$quizId/play", params: { quizId } });
	}

	return (
		<>
			<Link to="/" className="mb-[17px] inline-block p-2 text-sm">
				← All quizzes
			</Link>
			<PageHeading
				eyebrow="Quiz"
				title={quiz.name}
				lede={`${countLabel(quiz.questions.length, "question")} · ${course}`}
			/>
			<UnfinishedNotice quizId={quizId} status={status} />
			<WorkspaceGrid
				main={<HistoryPanel quiz={quiz} onReset={() => resetScores(quiz)} />}
				aside={
					<>
						<SessionPanel
							key={quiz.id}
							quiz={quiz}
							saveOk={saveOk}
							onStart={start}
						/>
						{status === "submitted" && (
							<Link
								to="/quizzes/$quizId/results"
								params={{ quizId }}
								className="mt-4 inline-block p-2 text-sm"
							>
								View results
							</Link>
						)}
					</>
				}
			/>
		</>
	);
}
