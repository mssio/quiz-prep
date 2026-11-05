import { gradeQuestion, isAnswered, summarize } from "#/lib/grading";
import { newId } from "#/lib/ids";
import type { Attempt, Question, ResponseValue } from "#/lib/schema";
import { type Rng, shuffled } from "#/lib/shuffle";

export type AttemptAction =
	| { type: "answer"; questionId: string; response: ResponseValue }
	| { type: "flag"; questionId: string }
	| { type: "navigate"; index: number }
	| { type: "submit"; at: string }
	| { type: "assess"; questionId: string; correct: boolean };

export function choiceIds(q: Question): (string | boolean)[] {
	switch (q.format) {
		case "true-false":
			return [true, false];
		case "matching":
			return q.right.map((choice) => choice.id);
		case "ordering":
			return q.items.map((choice) => choice.id);
		case "single-choice":
		case "multi-select":
			return q.options.map((choice) => choice.id);
		default:
			return [];
	}
}

type AttemptOptions = {
	isRetry?: boolean;
	keepOrder?: boolean;
	retryOf?: string | null;
};

function pickQuestions(
	questions: Question[],
	count: number,
	rng: Rng,
	keepOrder: boolean,
): Question[] {
	if (count === questions.length) return questions;
	const chosen = shuffled(questions, rng).slice(0, count);
	if (!keepOrder) return chosen;
	return questions.filter((q) => chosen.includes(q));
}

// Ordering items always shuffle: a file may list them in the correct order.
function displayOrder(q: Question, rng: Rng, keepOrder: boolean) {
	if (keepOrder && q.format !== "ordering") return choiceIds(q);
	return shuffled(choiceIds(q), rng);
}

export function createAttempt(
	questions: Question[],
	rng: Rng = Math.random,
	count: number = questions.length,
	{ isRetry = false, keepOrder = false, retryOf = null }: AttemptOptions = {},
): Attempt {
	if (!Number.isInteger(count) || count < 1 || count > questions.length) {
		throw new RangeError("Question count must be between 1 and the pool size.");
	}
	const picked = pickQuestions(questions, count, rng, keepOrder);
	const snapshot = structuredClone(picked);
	const displayOrders: Attempt["displayOrders"] = {};
	for (const q of snapshot) {
		displayOrders[q.id] = displayOrder(q, rng, keepOrder);
	}
	const questionIds = snapshot.map((q) => q.id);
	return {
		id: newId(),
		questions: snapshot,
		order: keepOrder ? questionIds : shuffled(questionIds, rng),
		displayOrders,
		responses: {},
		flags: {},
		assessments: {},
		currentIndex: 0,
		status: "active",
		isRetry,
		keepOrder,
		retryOf,
		submittedAt: null,
	};
}

function canAssess(a: Attempt, q: Question | undefined): boolean {
	return (
		a.status === "submitted" &&
		q?.format === "short-answer" &&
		q.answer !== null &&
		isAnswered(q, a.responses[q.id])
	);
}

export function updateAttempt(
	attempt: Attempt,
	action: AttemptAction,
): Attempt {
	const a = structuredClone(attempt);
	if (action.type === "navigate") {
		const last = a.order.length - 1;
		a.currentIndex = Math.max(0, Math.min(last, action.index));
		return a;
	}
	if (action.type === "submit") {
		if (a.status !== "active") return a;
		a.status = "submitted";
		a.submittedAt = action.at;
		return a;
	}
	const q = a.questions.find((x) => x.id === action.questionId);
	if (action.type === "assess") {
		if (q && canAssess(a, q)) a.assessments[q.id] = action.correct;
		return a;
	}
	if (a.status !== "active" || !q) return a;
	if (action.type === "answer")
		a.responses[q.id] = structuredClone(action.response);
	if (action.type === "flag") a.flags[q.id] = !a.flags[q.id];
	return a;
}

export function retryMissed(
	attempt: Attempt,
	rng: Rng = Math.random,
): Attempt | null {
	if (!summarize(attempt).finalized) return null;
	const missed = attempt.questions.filter((q) => {
		const grade = gradeQuestion(
			q,
			attempt.responses[q.id],
			attempt.assessments[q.id],
		);
		return grade.status === "incorrect";
	});
	if (missed.length === 0) return null;
	return createAttempt(missed, rng, missed.length, {
		isRetry: true,
		keepOrder: attempt.keepOrder,
		retryOf: attempt.retryOf ?? attempt.id,
	});
}
