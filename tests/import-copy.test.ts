import { expect, test } from "vitest";
import { importWarning } from "#/lib/import-copy";
import { parseQuizFile } from "#/lib/parser";
import type { HistoryEntry, WorkspaceState } from "#/lib/schema";
import { createQuiz } from "#/lib/workspace";
import allFormats from "./fixtures/all-formats.md?raw";

const NOW = "2026-11-04T10:00:00.000Z";
const parsed = parseQuizFile(allFormats, "all.md");
if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
const file = parsed;

function entry(id: string): HistoryEntry {
	return {
		id,
		submittedAt: NOW,
		questionCount: 5,
		totalQuestions: 5,
		correct: 4,
		totalGradable: 5,
		percentage: 80,
		isRetry: false,
	};
}

function stateWith(attemptsPerQuiz: number[]): WorkspaceState {
	const quizzes = attemptsPerQuiz.map((count, i) => ({
		...createQuiz(file, `Quiz ${i}`, NOW),
		history: Array.from({ length: count }, (_, n) => entry(`${i}-${n}`)),
	}));
	return { quizzes };
}

test("warning states what is lost and what replaces it", () => {
	expect(importWarning(stateWith([3, 3, 4, 0]), 6)).toBe(
		"This replaces your 4 quizzes and 10 recorded attempts with 6 quizzes from this file. This can't be undone.",
	);
});

test("singular wording", () => {
	expect(importWarning(stateWith([1]), 1)).toBe(
		"This replaces your 1 quiz and 1 recorded attempt with 1 quiz from this file. This can't be undone.",
	);
});
