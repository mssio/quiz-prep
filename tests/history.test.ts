import { expect, test } from "vitest";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import { formatPercent, historyEntryFor, quizStats } from "#/lib/history";
import type { HistoryEntry, Question } from "#/lib/schema";

function e(
	percentage: number,
	extra: Partial<HistoryEntry> = {},
): HistoryEntry {
	return {
		id: `e-${percentage}-${Math.random()}`,
		submittedAt: "2026-11-04T10:00:00.000Z",
		questionCount: 5,
		totalQuestions: 5,
		correct: 0,
		totalGradable: 5,
		percentage,
		isRetry: false,
		...extra,
	};
}

test("stats exclude retries", () => {
	expect(quizStats([e(60), e(80), e(100, { isRetry: true })])).toEqual({
		best: 80,
		average: 70,
		attempts: 2,
	});
});

test("stats are empty without counted attempts", () => {
	expect(quizStats([e(100, { isRetry: true })])).toEqual({
		best: null,
		average: null,
		attempts: 0,
	});
	expect(quizStats([])).toEqual({ best: null, average: null, attempts: 0 });
});

test("formatPercent shows a dash for null and at most one decimal", () => {
	expect(formatPercent(null)).toBe("—");
	expect(formatPercent(80)).toBe("80%");
	expect(formatPercent(66.666)).toBe("66.7%");
	expect(formatPercent(0)).toBe("0%");
});

function trueFalse(n: number, answer: boolean | null = true): Question {
	return {
		quizId: "q",
		id: `q:${n}`,
		number: n,
		format: "true-false",
		prompt: `Statement ${n}`,
		explanation: "",
		answer,
	};
}

test("historyEntryFor is null for an active attempt", () => {
	const attempt = createAttempt([trueFalse(1)]);
	expect(historyEntryFor(attempt, 1)).toBeNull();
});

test("historyEntryFor describes a finalized attempt", () => {
	const questions = [trueFalse(1), trueFalse(2)];
	let attempt = createAttempt(questions);
	attempt = updateAttempt(attempt, {
		type: "answer",
		questionId: "q:1",
		response: true,
	});
	attempt = updateAttempt(attempt, {
		type: "submit",
		at: "2026-11-04T10:00:00Z",
	});
	const entry = historyEntryFor(attempt, 9);
	expect(entry).toEqual({
		id: attempt.id,
		submittedAt: "2026-11-04T10:00:00Z",
		questionCount: 2,
		totalQuestions: 9,
		correct: 1,
		totalGradable: 2,
		percentage: 50,
		isRetry: false,
	});
});

test("historyEntryFor is null when nothing is gradable", () => {
	let attempt = createAttempt([trueFalse(1, null)]);
	attempt = updateAttempt(attempt, {
		type: "submit",
		at: "2026-11-04T10:00:00Z",
	});
	expect(historyEntryFor(attempt, 1)).toBeNull();
});
