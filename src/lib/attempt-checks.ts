import { hasUniqueValues } from "#/lib/answer-checks";

// Consistency checks for an attempt. Each returns an error message,
// or null when everything is fine.

type Choice = { id: string; text: string };
type AttemptQuestion = { id: string; format: string } & Record<string, unknown>;
type AttemptShape = {
	questions: AttemptQuestion[];
	order: string[];
	displayOrders: Record<string, unknown[]>;
	responses: Record<string, unknown>;
	flags: Record<string, boolean>;
	assessments: Record<string, boolean>;
	currentIndex: number;
};

function hasChoice(choices: Choice[], id: unknown): boolean {
	return choices.some((choice) => choice.id === id);
}

function choiceIdsOf(question: AttemptQuestion): (string | boolean)[] {
	if (question.format === "true-false") return [true, false];
	const choices = choicesOf(question);
	return choices.map((choice) => choice.id);
}

function choicesOf(question: AttemptQuestion): Choice[] {
	if (question.format === "matching") return question.right as Choice[];
	if (question.format === "ordering") return question.items as Choice[];
	return question.options as Choice[];
}

function isPermutation(actual: unknown[], expected: unknown[]): boolean {
	if (!hasUniqueValues(actual) || actual.length !== expected.length)
		return false;
	return expected.every((value) => actual.includes(value));
}

function isMatchingResponse(question: AttemptQuestion, response: unknown) {
	if (typeof response !== "object" || response === null) return false;
	if (Array.isArray(response)) return false;
	const left = question.left as Choice[];
	const right = question.right as Choice[];
	return Object.entries(response).every(
		([leftId, rightId]) =>
			hasChoice(left, leftId) && (rightId === "" || hasChoice(right, rightId)),
	);
}

function isStringList(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isOrderingResponse(question: AttemptQuestion, response: unknown) {
	const items = question.items as Choice[];
	if (!isStringList(response)) return false;
	return (
		hasUniqueValues(response) &&
		response.length === items.length &&
		response.every((id) => hasChoice(items, id))
	);
}

function isMultiSelectResponse(question: AttemptQuestion, response: unknown) {
	const options = question.options as Choice[];
	if (!isStringList(response)) return false;
	return (
		hasUniqueValues(response) && response.every((id) => hasChoice(options, id))
	);
}

function hasRightKind(question: AttemptQuestion, response: unknown): boolean {
	switch (question.format) {
		case "single-choice":
			return hasChoice(question.options as Choice[], response);
		case "true-false":
			return typeof response === "boolean";
		case "short-answer":
			return typeof response === "string";
		case "fill-in-blank":
			return isStringList(response);
		case "multi-select":
			return isMultiSelectResponse(question, response);
		case "ordering":
			return isOrderingResponse(question, response);
		case "matching":
			return isMatchingResponse(question, response);
		default:
			return false;
	}
}

function checkQuestion(attempt: AttemptShape, question: AttemptQuestion) {
	const displayOrder = attempt.displayOrders[question.id];
	if (
		!Array.isArray(displayOrder) ||
		!isPermutation(displayOrder, choiceIdsOf(question))
	) {
		return `display order for ${question.id} must list every choice once`;
	}
	const response = attempt.responses[question.id];
	if (response !== undefined && !hasRightKind(question, response)) {
		return `response for ${question.id} does not fit its format`;
	}
	return null;
}

function checkKeys(attempt: AttemptShape): string | null {
	const maps = [
		attempt.displayOrders,
		attempt.responses,
		attempt.flags,
		attempt.assessments,
	];
	const allKeysBelong = maps.every((map) =>
		Object.keys(map).every((id) => attempt.order.includes(id)),
	);
	return allKeysBelong ? null : "keys must belong to the attempt's questions";
}

function checkOrder(attempt: AttemptShape): string | null {
	const questionIds = attempt.questions.map((question) => question.id);
	if (!hasUniqueValues(questionIds)) return "question ids must be unique";
	if (!isPermutation(attempt.order, questionIds))
		return "order must list every question once";
	const { currentIndex } = attempt;
	if (currentIndex < 0 || currentIndex >= attempt.order.length) {
		return "currentIndex is out of range";
	}
	return null;
}

export function checkAttempt(attempt: AttemptShape): string | null {
	const orderProblem = checkOrder(attempt);
	if (orderProblem) return orderProblem;
	const keyProblem = checkKeys(attempt);
	if (keyProblem) return keyProblem;
	for (const question of attempt.questions) {
		const problem = checkQuestion(attempt, question);
		if (problem) return problem;
	}
	return null;
}
