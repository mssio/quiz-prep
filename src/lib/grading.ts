import { isSameNumber } from "#/lib/numeric-answer";
import type { Attempt, Question, ResponseValue } from "#/lib/schema";

export type GradeStatus = "correct" | "incorrect" | "pending" | "ungraded";
export type Grade = { status: GradeStatus; selfAssessed: boolean };
export type Summary = {
	correct: number;
	incorrect: number;
	pending: number;
	ungraded: number;
	totalGradable: number;
	percentage: number | null;
	finalized: boolean;
};

type Response = ResponseValue | undefined;

// Trim, collapse inner whitespace and ignore case, so " DNS " equals "dns".
function normalize(text: string): string {
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasText(value: string): boolean {
	return normalize(value) !== "";
}

export function blankCount(q: Question & { format: "fill-in-blank" }): number {
	if (q.answer !== null && q.answer.length > 0) return q.answer.length;
	const markers = q.prompt.match(/____/g);
	return markers?.length || 1;
}

function isStringList(response: Response): response is string[] {
	return Array.isArray(response);
}

function isMap(response: Response): response is Record<string, string> {
	return (
		typeof response === "object" &&
		response !== null &&
		!Array.isArray(response)
	);
}

export function isAnswered(q: Question, response: Response): boolean {
	if (response === undefined) return false;
	switch (q.format) {
		case "single-choice":
			return q.options.some((option) => option.id === response);
		case "multi-select":
			return isStringList(response) && response.length > 0;
		case "true-false":
			return typeof response === "boolean";
		case "short-answer":
			return typeof response === "string" && hasText(response);
		case "fill-in-blank":
			return (
				isStringList(response) &&
				response.length === blankCount(q) &&
				response.every(hasText)
			);
		case "matching":
			return (
				isMap(response) &&
				q.left.every((left) =>
					q.right.some((right) => right.id === response[left.id]),
				)
			);
		case "ordering":
			return (
				isStringList(response) &&
				response.length === q.items.length &&
				new Set(response).size === response.length &&
				q.items.every((item) => response.includes(item.id))
			);
	}
}

function isCorrect(q: Question, response: ResponseValue): boolean {
	switch (q.format) {
		case "single-choice":
		case "true-false":
			return response === q.answer;
		case "multi-select": {
			const chosen = response as string[];
			const expected = q.answer ?? [];
			return (
				chosen.length === expected.length &&
				new Set(chosen).size === chosen.length &&
				expected.every((id) => chosen.includes(id))
			);
		}
		case "fill-in-blank": {
			const typed = response as string[];
			return (q.answer ?? []).every(
				(expected, i) =>
					normalize(expected) === normalize(typed[i]) ||
					isSameNumber(expected, typed[i]),
			);
		}
		case "matching": {
			const picked = response as Record<string, string>;
			return q.left.every((left) => picked[left.id] === q.answer?.[left.id]);
		}
		case "ordering": {
			const ids = response as string[];
			return ids.every((id, i) => q.answer?.[id] === i + 1);
		}
		case "short-answer":
			return false;
	}
}

function gradeShortAnswer(assessment: boolean | undefined): Grade {
	if (assessment === undefined) {
		return { status: "pending", selfAssessed: false };
	}
	return { status: assessment ? "correct" : "incorrect", selfAssessed: true };
}

export function gradeQuestion(
	q: Question,
	response: Response,
	assessment?: boolean,
): Grade {
	if (q.answer === null) return { status: "ungraded", selfAssessed: false };
	if (response === undefined || !isAnswered(q, response)) {
		return { status: "incorrect", selfAssessed: false };
	}
	if (q.format === "short-answer") return gradeShortAnswer(assessment);
	const status = isCorrect(q, response) ? "correct" : "incorrect";
	return { status, selfAssessed: false };
}

export function summarize(
	attempt: Pick<Attempt, "questions" | "responses" | "assessments" | "status">,
): Summary {
	const summary: Summary = {
		correct: 0,
		incorrect: 0,
		pending: 0,
		ungraded: 0,
		totalGradable: 0,
		percentage: null,
		finalized: false,
	};
	for (const q of attempt.questions) {
		const grade = gradeQuestion(
			q,
			attempt.responses[q.id],
			attempt.assessments[q.id],
		);
		summary[grade.status]++;
	}
	summary.totalGradable = summary.correct + summary.incorrect + summary.pending;
	summary.finalized = attempt.status === "submitted" && summary.pending === 0;
	if (summary.finalized && summary.totalGradable > 0) {
		summary.percentage = (100 * summary.correct) / summary.totalGradable;
	}
	return summary;
}
