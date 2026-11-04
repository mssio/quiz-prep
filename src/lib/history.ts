import { summarize } from "#/lib/grading";
import type { Attempt, HistoryEntry } from "#/lib/schema";

export type QuizStats = {
	best: number | null;
	average: number | null;
	attempts: number;
};

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
	};
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
