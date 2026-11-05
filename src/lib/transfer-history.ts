import type { z } from "zod";
import { hasUniqueValues } from "#/lib/answer-checks";
import { responseFits } from "#/lib/attempt-checks";
import type {
	HistoryEntry,
	QuestionContent,
	Quiz,
	SessionReview,
} from "#/lib/schema";
import { historyEntrySchema } from "#/lib/schema";

// A saved entry's shape, except that its review names questions by number.
// Question ids contain the quiz id, and import gives every quiz a new one.
export const exportHistoryEntrySchema = historyEntrySchema;

export type ExportHistoryEntry = z.infer<typeof exportHistoryEntrySchema>;

function renameKeys<T>(
	record: Record<string, T>,
	rename: (key: string) => string,
): Record<string, T> {
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [rename(key), value]),
	);
}

function renameQuestions(
	review: SessionReview,
	rename: (key: string) => string,
): SessionReview {
	return {
		order: review.order.map(rename),
		responses: renameKeys(review.responses, rename),
		assessments: renameKeys(review.assessments, rename),
		flags: renameKeys(review.flags, rename),
	};
}

function checkReview(
	questions: QuestionContent[],
	review: SessionReview,
): string | null {
	const byNumber = new Map(questions.map((q) => [String(q.number), q]));
	if (!hasUniqueValues(review.order)) return "order must not repeat a question";
	if (!review.order.every((number) => byNumber.has(number)))
		return "order must name questions the quiz has";
	const keys = [
		...Object.keys(review.responses),
		...Object.keys(review.assessments),
		...Object.keys(review.flags),
	];
	if (!keys.every((key) => review.order.includes(key)))
		return "keys must belong to the session's questions";
	const fits = Object.entries(review.responses).every(([number, response]) => {
		const question = byNumber.get(number);
		return question !== undefined && responseFits(question, response);
	});
	if (!fits) return "a response does not fit its question";
	// A finished session assessed every answered short answer it can. Without
	// that, the read-only review would offer an "Assess" button.
	const unassessed = review.order.some((number) => {
		const question = byNumber.get(number);
		const response = review.responses[number];
		return (
			question?.format === "short-answer" &&
			question.answer !== null &&
			typeof response === "string" &&
			response.trim() !== "" &&
			review.assessments[number] === undefined
		);
	});
	return unassessed ? "an answered short answer lacks its assessment" : null;
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0;

// The load schema stays lenient so a load never fails. An import is strict,
// because a bad date or percentage would break the pages that show it.
function checkEntryFields(entry: ExportHistoryEntry): string | null {
	if (Number.isNaN(new Date(entry.submittedAt).getTime()))
		return "submittedAt must be a date";
	if (!(entry.percentage >= 0 && entry.percentage <= 100))
		return "percentage must be from 0 to 100";
	const counts = [
		entry.questionCount,
		entry.totalQuestions,
		entry.correct,
		entry.totalGradable,
	];
	if (!counts.every(isCount)) return "counts must be whole numbers";
	if (entry.questionCount < 1) return "a session has at least one question";
	if (entry.correct > entry.totalGradable)
		return "correct can't exceed the gradable questions";
	return null;
}

// Saved reviews aren't checked against the quiz when they load. One that doesn't
// fit is dropped here, because it would make import reject the whole file.
function toExportReview(
	quiz: Quiz,
	review: SessionReview,
): SessionReview | null {
	const numbers = new Map(quiz.questions.map((q) => [q.id, String(q.number)]));
	const exported = renameQuestions(review, (id) => numbers.get(id) ?? id);
	return checkReview(quiz.questions, exported) === null ? exported : null;
}

export function toExportHistory(quiz: Quiz): ExportHistoryEntry[] {
	return quiz.history.map((entry) => ({
		...entry,
		review: entry.review && toExportReview(quiz, entry.review),
	}));
}

export function fromExportHistory(
	history: ExportHistoryEntry[],
	quizId: string,
): HistoryEntry[] {
	const toId = (number: string) => `${quizId}:${number}`;
	return history.map((entry) => ({
		...entry,
		review: entry.review && renameQuestions(entry.review, toId),
	}));
}

// Returns an error message, or null when everything is fine. A retryOf naming a
// missing session is fine: the original may have had no score to record.
export function checkExportHistory(
	questions: QuestionContent[],
	history: ExportHistoryEntry[],
): string | null {
	if (!hasUniqueValues(history.map((entry) => entry.id)))
		return "history entry ids must be unique";
	for (const entry of history) {
		const problem =
			checkEntryFields(entry) ??
			(entry.review && checkReview(questions, entry.review));
		if (problem) return problem;
	}
	return null;
}
