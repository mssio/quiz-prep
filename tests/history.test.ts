import { expect, test } from "vitest";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import {
	formatPercent,
	formatSessionDate,
	groupHistory,
	historyEntryFor,
	quizStats,
	reviewOf,
	sessionView,
} from "#/lib/history";
import type { HistoryEntry, Question, Quiz } from "#/lib/schema";

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
		review: null,
		retryOf: null,
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
		review: {
			order: attempt.order,
			responses: { "q:1": true },
			assessments: {},
			flags: {},
		},
		retryOf: null,
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

test("a finalized attempt's entry carries its answers and retry link", () => {
	let finalizedRetry = createAttempt([trueFalse(1)], Math.random, 1, {
		isRetry: true,
		retryOf: "original",
	});
	finalizedRetry = updateAttempt(finalizedRetry, {
		type: "answer",
		questionId: "q:1",
		response: true,
	});
	finalizedRetry = updateAttempt(finalizedRetry, {
		type: "flag",
		questionId: "q:1",
	});
	finalizedRetry = updateAttempt(finalizedRetry, {
		type: "submit",
		at: "2026-11-04T10:00:00Z",
	});
	const entry = historyEntryFor(finalizedRetry, 5);
	expect(entry?.review?.order).toEqual(finalizedRetry.order);
	expect(entry?.review?.responses).toEqual(finalizedRetry.responses);
	expect(entry?.review?.flags).toEqual(finalizedRetry.flags);
	expect(entry?.retryOf).toBe("original");
});

test("reviewOf shares nothing with the attempt", () => {
	const attempt = {
		...createAttempt([trueFalse(1)]),
		responses: { "q:1": ["a"] },
		assessments: { "q:1": true },
		flags: { "q:1": true },
	};
	const review = reviewOf(attempt);
	expect(review).toEqual({
		order: attempt.order,
		responses: attempt.responses,
		assessments: attempt.assessments,
		flags: attempt.flags,
	});
	expect(review.order).not.toBe(attempt.order);
	expect(review.responses["q:1"]).not.toBe(attempt.responses["q:1"]);
	expect(review.assessments).not.toBe(attempt.assessments);
	expect(review.flags).not.toBe(attempt.flags);
});

const at = (hour: number) =>
	`2026-11-04T${String(hour).padStart(2, "0")}:00:00.000Z`;

test("sessions are newest first, with retries under them oldest first", () => {
	const old = e(40, { id: "old", submittedAt: at(8) });
	const parent = e(60, { id: "parent", submittedAt: at(9) });
	const retry1 = e(70, {
		id: "r1",
		submittedAt: at(10),
		isRetry: true,
		retryOf: "parent",
	});
	const retry2 = e(80, {
		id: "r2",
		submittedAt: at(11),
		isRetry: true,
		retryOf: "parent",
	});
	const groups = groupHistory([old, parent, retry2, retry1]);
	expect(groups.map((g) => g.entry.id)).toEqual(["parent", "old"]);
	expect(groups[0].retries.map((r) => r.id)).toEqual(["r1", "r2"]);
});

test("a retry with no original in the history is its own group", () => {
	const groups = groupHistory([
		e(50, { id: "r", isRetry: true, retryOf: "gone" }),
	]);
	expect(groups).toEqual([
		{ entry: expect.objectContaining({ id: "r" }), retries: [] },
	]);
});

test("an old retry with no link stays a top-level row", () => {
	const groups = groupHistory([
		e(50, { id: "r", isRetry: true, retryOf: null }),
	]);
	expect(groups).toHaveLength(1);
	expect(groups[0].retries).toEqual([]);
});

test("a self-referencing entry is a top-level group", () => {
	const groups = groupHistory([e(50, { id: "s", retryOf: "s" })]);
	expect(groups.map((g) => [g.entry.id, g.retries.length])).toEqual([["s", 0]]);
});

test("a two-entry cycle loses and duplicates nothing", () => {
	const a = e(50, { id: "a", submittedAt: at(9), retryOf: "b" });
	const b = e(60, { id: "b", submittedAt: at(10), retryOf: "a" });
	const groups = groupHistory([a, b]);
	expect(groups.map((g) => g.entry.id)).toEqual(["b", "a"]);
	expect(groups.every((g) => g.retries.length === 0)).toBe(true);
});

test("a retry of a retry groups under the original session", () => {
	const p = e(50, { id: "p", submittedAt: at(8) });
	const r = e(60, { id: "r", submittedAt: at(9), isRetry: true, retryOf: "p" });
	const rr = e(70, {
		id: "rr",
		submittedAt: at(10),
		isRetry: true,
		retryOf: "r",
	});
	const groups = groupHistory([rr, p, r]);
	expect(groups.map((g) => g.entry.id)).toEqual(["p"]);
	expect(groups[0].retries.map((x) => x.id)).toEqual(["r", "rr"]);
});

test("a three-level chain groups under its root, and a missing root ends the chain", () => {
	const p = e(50, { id: "p", submittedAt: at(8) });
	const a = e(60, { id: "a", submittedAt: at(9), isRetry: true, retryOf: "p" });
	const b = e(70, {
		id: "b",
		submittedAt: at(10),
		isRetry: true,
		retryOf: "a",
	});
	const c = e(80, {
		id: "c",
		submittedAt: at(11),
		isRetry: true,
		retryOf: "b",
	});
	const groups = groupHistory([c, b, a, p]);
	expect(groups.map((g) => g.entry.id)).toEqual(["p"]);
	expect(groups[0].retries.map((x) => x.id)).toEqual(["a", "b", "c"]);
	const orphan = groupHistory([
		e(1, { id: "x", submittedAt: at(1), retryOf: "gone" }),
		e(2, { id: "y", submittedAt: at(2), retryOf: "x" }),
	]);
	expect(orphan.map((g) => g.entry.id)).toEqual(["x"]);
	expect(orphan[0].retries.map((x) => x.id)).toEqual(["y"]);
});

test("formatSessionDate renders a medium date and short time", () => {
	expect(formatSessionDate("2026-11-04T10:00:00.000Z")).toMatch(/2026/);
});

function quizWithReview(order: string[]): Quiz {
	const questions = [trueFalse(1), trueFalse(2)];
	return {
		id: "q",
		name: "Q",
		filename: "q.md",
		title: "Q",
		course: "",
		questions,
		attempt: null,
		addedAt: "2026-11-04T09:00:00.000Z",
		history: [
			e(50, {
				id: "s1",
				review: {
					order,
					responses: { "q:1": true },
					assessments: {},
					flags: {},
				},
			}),
			e(50, { id: "old", review: null }),
		],
	};
}

test("sessionView returns null for an unknown session or one with no answers", () => {
	const quiz = quizWithReview(["q:1"]);
	expect(sessionView(quiz, "missing")).toBeNull();
	expect(sessionView(quiz, "old")).toBeNull();
});

test("sessionView keeps the order shown and skips a question the quiz lacks", () => {
	const result = sessionView(quizWithReview(["q:2", "q:404", "q:1"]), "s1");
	expect(result?.view.order).toEqual(["q:2", "q:1"]);
	expect(result?.view.questions.map((q) => q.id)).toEqual(["q:2", "q:1"]);
	expect(result?.view.status).toBe("submitted");
});
