import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { SessionPanel } from "#/components/quizzes/SessionPanel";
import {
	choiceIds,
	createAttempt,
	retryMissed,
	updateAttempt,
} from "#/lib/attempt";
import { attemptSchema, type Quiz } from "#/lib/schema";
import { orderLabel } from "#/lib/session";
import { allFormatQuestions } from "./helpers";

const qs = allFormatQuestions();
const [single, multi, tf, , , matching, ordering] = qs;
const fileOrder = qs.map((q) => q.id);
const alwaysFirst = () => 0;

test("keepOrder shows questions in file order", () => {
	const a = createAttempt(qs, alwaysFirst, qs.length, { keepOrder: true });
	expect(a.order).toEqual(fileOrder);
});

test("keepOrder shows choices in file order", () => {
	const a = createAttempt(qs, alwaysFirst, qs.length, { keepOrder: true });
	for (const q of [single, multi, tf, matching]) {
		expect(a.displayOrders[q.id]).toEqual(choiceIds(q));
	}
});

test("keepOrder still shuffles ordering items, which may be the answer", () => {
	const a = createAttempt(qs, alwaysFirst, qs.length, { keepOrder: true });
	expect(a.displayOrders[ordering.id]).not.toEqual(choiceIds(ordering));
	expect(new Set(a.displayOrders[ordering.id])).toEqual(
		new Set(choiceIds(ordering)),
	);
});

test("keepOrder with a smaller count picks at random, then uses file order", () => {
	const first = createAttempt(qs, alwaysFirst, 3, { keepOrder: true });
	const second = createAttempt(qs, () => 0.999, 3, { keepOrder: true });
	expect(first.order).not.toEqual(second.order);
	for (const attempt of [first, second]) {
		expect(attempt.order).toHaveLength(3);
		expect(attempt.order).toEqual(
			fileOrder.filter((id) => attempt.order.includes(id)),
		);
	}
});

test("attempts are shuffled unless keepOrder is asked for", () => {
	const a = createAttempt(qs, alwaysFirst);
	expect(a.keepOrder).toBe(false);
	expect(a.order).not.toEqual(fileOrder);
	expect(a.displayOrders[single.id]).not.toEqual(choiceIds(single));
});

test("a retry keeps the attempt's order setting", () => {
	const missed = [single, tf, matching];
	const attempt = createAttempt(missed, alwaysFirst, missed.length, {
		keepOrder: true,
	});
	const submitted = updateAttempt(attempt, {
		type: "submit",
		at: "2026-11-04T10:00:00.000Z",
	});
	const retry = retryMissed(submitted, alwaysFirst);
	expect(retry?.keepOrder).toBe(true);
	expect(retry?.order).toEqual(missed.map((q) => q.id));
});

test("an attempt saved before this option loads as shuffled", () => {
	const { keepOrder: _removed, ...saved } = createAttempt(qs);
	expect(attemptSchema.parse(saved).keepOrder).toBe(false);
});

test("orderLabel names the order shown to the learner", () => {
	expect(orderLabel(true)).toBe("Original");
	expect(orderLabel(false)).toBe("Shuffled");
});

test("session panel offers original order, switched off by default", () => {
	const quiz: Quiz = {
		id: "quiz-1",
		name: "Ch 1",
		filename: "ch1.md",
		title: "",
		course: "",
		questions: qs,
		history: [],
		attempt: null,
		addedAt: "2026-11-04T00:00:00.000Z",
	};
	const h = renderToStaticMarkup(
		<SessionPanel quiz={quiz} saveOk onStart={() => {}} />,
	);
	expect(h).toContain("Keep original order");
	expect(h).toContain('type="checkbox"');
	expect(h).not.toContain("checked");
	expect(h).toContain("Ordering questions stay shuffled");
});
