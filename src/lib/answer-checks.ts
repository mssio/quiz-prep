import type { z } from "zod";

// Answer checks for each question format. Each returns an error message,
// or null when the answer is fine. A null answer (unknown) is always fine.

type Choice = { id: string; text: string };

export function hasUniqueValues(values: unknown[]): boolean {
	return new Set(values).size === values.length;
}

function hasChoice(choices: Choice[], id: string): boolean {
	return choices.some((choice) => choice.id === id);
}

export function checkSingleChoice(options: Choice[], answer: string | null) {
	if (answer === null || hasChoice(options, answer)) return null;
	return "answer must be one of the options";
}

export function checkMultiSelect(options: Choice[], answer: string[] | null) {
	if (answer === null) return null;
	if (answer.length < 2) return "answer needs at least two options";
	if (!hasUniqueValues(answer)) return "answer options must be unique";
	if (!answer.every((id) => hasChoice(options, id))) {
		return "answer must only use existing options";
	}
	return null;
}

export function checkMatching(
	left: Choice[],
	right: Choice[],
	answer: Record<string, string> | null,
) {
	if (answer === null) return null;
	if (Object.keys(answer).length !== left.length) {
		return "answer must cover every left item";
	}
	const pointsAtRight = left.every((item) => hasChoice(right, answer[item.id]));
	if (!pointsAtRight) return "answer must point at a right item";
	return null;
}

export function checkOrdering(
	items: Choice[],
	answer: Record<string, number> | null,
) {
	if (answer === null) return null;
	const positions = Object.values(answer);
	if (positions.length !== items.length) return "answer must cover every item";
	if (!hasUniqueValues(positions)) return "positions must be unique";
	const allInRange = items.every((item) => {
		const position = answer[item.id];
		return (
			Number.isInteger(position) && position >= 1 && position <= items.length
		);
	});
	if (!allInRange) return "positions must run from 1 to the item count";
	return null;
}

export function reportIssue(ctx: z.RefinementCtx, message: string | null) {
	if (message === null) return;
	ctx.addIssue({ code: "custom", message, path: ["answer"] });
}
