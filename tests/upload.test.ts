import { expect, test } from "vitest";
import type { ParsedFile, RejectedFile } from "#/lib/parser";
import {
	canAdd,
	type PendingFile,
	pendingFiles,
	quizzesFromPending,
	validCount,
} from "#/lib/upload";

const NOW = "2026-11-04T10:00:00.000Z";

function okFile(title: string, filename = "a.md"): ParsedFile {
	return {
		ok: true,
		filename,
		title,
		course: "PRAC100",
		questions: [{ format: "true-false", prompt: "Sky is blue?", answer: true }],
	} as ParsedFile;
}

const rejected: RejectedFile = {
	ok: false,
	filename: "bad.md",
	errors: ["bad.md: Q4: Answer must be True or False."],
};

test("names start as titles; rejected files are skipped", () => {
	const pending = pendingFiles([okFile("Ch 1"), rejected]);
	expect(pending[0].name).toBe("Ch 1");
	expect(pending[1].name).toBe("");
	expect(validCount(pending)).toBe(1);
	expect(quizzesFromPending(pending, NOW)).toHaveLength(1);
});

test("canAdd needs a valid file and no blank names", () => {
	expect(canAdd(pendingFiles([rejected]))).toBe(false);
	expect(canAdd([{ result: okFile("A"), name: "  " }])).toBe(false);
	expect(canAdd(pendingFiles([okFile("A"), rejected]))).toBe(true);
});

test("each file becomes one quiz, under the edited name", () => {
	const pending: PendingFile[] = [
		{ result: okFile("Ch 1", "one.md"), name: "  First  " },
		{ result: okFile("Ch 1", "one.md"), name: "Second" },
		{ result: rejected, name: "" },
	];
	const quizzes = quizzesFromPending(pending, NOW);
	expect(quizzes.map((quiz) => quiz.name)).toEqual(["First", "Second"]);
	expect(quizzes[0].id).not.toBe(quizzes[1].id);
	expect(quizzes[0].addedAt).toBe(NOW);
	expect(quizzes[0].questions).toHaveLength(1);
});
