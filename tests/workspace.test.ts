import { expect, test } from "vitest";
import { createAttempt } from "#/lib/attempt";
import { parseQuizFile } from "#/lib/parser";
import type { WorkspaceState } from "#/lib/schema";
import { createQuiz, findQuiz, workspaceReducer } from "#/lib/workspace";
import allFormats from "./fixtures/all-formats.md?raw";

const NOW = "2026-11-04T10:00:00.000Z";
const file = parseQuizFile(allFormats, "all.md");
if (!file.ok) throw new Error(file.errors.join("\n"));

test("createQuiz gives distinct ids to two copies of one file", () => {
	const a = createQuiz(file, "A", NOW);
	const b = createQuiz(file, "B", NOW);
	expect(a.id).not.toBe(b.id);
	expect(a.questions[0].id).toBe(`${a.id}:1`);
	expect(a.questions[0].quizId).toBe(a.id);
	expect(a.history).toEqual([]);
	expect(a.attempt).toBeNull();
});

test("addQuizzes appends and findQuiz looks up by id", () => {
	const a = createQuiz(file, "A", NOW);
	const next = workspaceReducer(
		{ quizzes: [] },
		{ type: "addQuizzes", quizzes: [a] },
	);
	expect(next.quizzes).toEqual([a]);
	expect(findQuiz(next, a.id)).toBe(a);
	expect(findQuiz(next, "missing")).toBeUndefined();
});

test("attempt action only touches its quiz", () => {
	const a = createQuiz(file, "A", NOW);
	const b = createQuiz(file, "B", NOW);
	a.attempt = createAttempt(a.questions);
	b.attempt = createAttempt(b.questions);
	const next = workspaceReducer(
		{ quizzes: [a, b] },
		{
			type: "attempt",
			quizId: a.id,
			action: { type: "flag", questionId: a.questions[0].id },
		},
	);
	expect(next.quizzes[0].attempt?.flags[a.questions[0].id]).toBe(true);
	expect(next.quizzes[1]).toBe(b);
});

test("startAttempt replaces the quiz attempt", () => {
	const a = createQuiz(file, "A", NOW);
	const first = createAttempt(a.questions);
	const second = createAttempt(a.questions);
	const started = workspaceReducer(
		{ quizzes: [a] },
		{ type: "startAttempt", quizId: a.id, attempt: first },
	);
	expect(started.quizzes[0].attempt).toBe(first);
	const restarted = workspaceReducer(started, {
		type: "startAttempt",
		quizId: a.id,
		attempt: second,
	});
	expect(restarted.quizzes[0].attempt).toBe(second);
});

test("replaceState swaps the whole state", () => {
	const replacement: WorkspaceState = {
		quizzes: [createQuiz(file, "New", NOW)],
	};
	const next = workspaceReducer(
		{ quizzes: [] },
		{ type: "replaceState", state: replacement },
	);
	expect(next).toBe(replacement);
});
