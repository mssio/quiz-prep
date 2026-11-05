import type { ParseResult } from "#/lib/parser";
import type { Quiz } from "#/lib/schema";
import { createQuiz, isValidName } from "#/lib/workspace";

// One chosen file waiting in the naming step. Rejected files keep an empty name.
export type PendingFile = { result: ParseResult; name: string };

export function pendingFiles(results: ParseResult[]): PendingFile[] {
	return results.map((result) => ({
		result,
		name: result.ok ? result.title : "",
	}));
}

export function validCount(pending: PendingFile[]): number {
	return pending.filter((item) => item.result.ok).length;
}

export function canAdd(pending: PendingFile[]): boolean {
	const valid = pending.filter((item) => item.result.ok);
	if (valid.length === 0) return false;
	return valid.every((item) => isValidName(item.name));
}

export function quizzesFromPending(
	pending: PendingFile[],
	addedAt: string,
): Quiz[] {
	const quizzes: Quiz[] = [];
	for (const { result, name } of pending) {
		if (result.ok) quizzes.push(createQuiz(result, name.trim(), addedAt));
	}
	return quizzes;
}

// Files added while the naming step is open join it; earlier edits stay.
export function appendPending(
	current: PendingFile[] | null,
	added: PendingFile[],
): PendingFile[] {
	return [...(current ?? []), ...added];
}
