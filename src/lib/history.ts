import { summarize } from "#/lib/grading";
import type {
	Attempt,
	HistoryEntry,
	Quiz,
	SessionReview,
	WorkspaceState,
} from "#/lib/schema";

export type QuizStats = {
	best: number | null;
	average: number | null;
	attempts: number;
};

export function reviewOf(attempt: Attempt): SessionReview {
	const { order, responses, assessments, flags } = attempt;
	return structuredClone({ order, responses, assessments, flags });
}

// Only a finalized attempt with a percentage becomes a history entry.
export function historyEntryFor(
	attempt: Attempt,
	totalQuestions: number,
): HistoryEntry | null {
	const summary = summarize(attempt);
	if (!summary.finalized || summary.percentage === null) return null;
	if (attempt.submittedAt === null) return null;
	return {
		id: attempt.id,
		submittedAt: attempt.submittedAt,
		questionCount: attempt.questions.length,
		totalQuestions,
		correct: summary.correct,
		totalGradable: summary.totalGradable,
		percentage: summary.percentage,
		isRetry: attempt.isRetry,
		review: reviewOf(attempt),
		retryOf: attempt.retryOf,
	};
}

function backfillQuiz(quiz: Quiz): Quiz {
	const { attempt } = quiz;
	if (!attempt || !summarize(attempt).finalized) return quiz;
	const missing = (entry: HistoryEntry) =>
		entry.id === attempt.id && entry.review === null;
	if (!quiz.history.some(missing)) return quiz;
	const history = quiz.history.map((entry) =>
		missing(entry) ? { ...entry, review: reviewOf(attempt) } : entry,
	);
	return { ...quiz, history };
}

// A quiz's saved attempt is the one past session whose answers still exist, so
// an entry saved before reviews existed can take them from it.
export function backfillReviews(state: WorkspaceState): WorkspaceState {
	return { ...state, quizzes: state.quizzes.map(backfillQuiz) };
}

// Retries are practice, so they never count towards best, average or attempts.
export function quizStats(history: HistoryEntry[]): QuizStats {
	const counted = history.filter((entry) => !entry.isRetry);
	if (counted.length === 0) return { best: null, average: null, attempts: 0 };
	const percentages = counted.map((entry) => entry.percentage);
	const total = percentages.reduce((sum, value) => sum + value, 0);
	return {
		best: Math.max(...percentages),
		average: total / counted.length,
		attempts: counted.length,
	};
}

const percentFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

export function formatPercent(value: number | null): string {
	if (value === null) return "—";
	return `${percentFormat.format(value)}%`;
}
