import { expect, test } from "vitest";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import { quizStats } from "#/lib/history";
import { parseQuizFile } from "#/lib/parser";
import type { Question, Quiz, WorkspaceState } from "#/lib/schema";
import {
	createQuiz,
	findQuiz,
	isValidName,
	playRedirect,
	questionSource,
	quizStatus,
	resultsRedirect,
	sortedQuizzes,
	totalAttempts,
	workspaceReducer,
} from "#/lib/workspace";
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

test("playRedirect sends each attempt state to the right screen", () => {
	const quiz = createQuiz(file, "Quiz", NOW);
	const active = createAttempt(quiz.questions);
	const submitted = updateAttempt(active, { type: "submit", at: NOW });
	expect(playRedirect(null)).toBe("quiz");
	expect(playRedirect(active)).toBeNull();
	expect(playRedirect(submitted)).toBe("results");
});

test("resultsRedirect keeps only a submitted attempt on results", () => {
	const quiz = createQuiz(file, "Quiz", NOW);
	const active = createAttempt(quiz.questions);
	const submitted = updateAttempt(active, { type: "submit", at: NOW });
	expect(resultsRedirect(null)).toBe("quiz");
	expect(resultsRedirect(active)).toBe("play");
	expect(resultsRedirect(submitted)).toBeNull();
});

const parsedFile = file;
const SUBMIT_AT = "2026-11-04T11:00:00.000Z";
const LATER = "2026-11-04T12:00:00.000Z";

function tf(n: number, answer: boolean | null = true): Question {
	return {
		quizId: "q",
		id: `q:${n}`,
		number: n,
		format: "true-false",
		prompt: `Statement ${n}`,
		explanation: "",
		answer,
	};
}

function shortAnswer(n: number): Question {
	return {
		quizId: "q",
		id: `q:${n}`,
		number: n,
		format: "short-answer",
		prompt: `Define ${n}`,
		explanation: "",
		answer: "model",
	};
}

function quizWith(questions: Question[]): Quiz {
	const quiz = createQuiz(parsedFile, "Quiz", NOW);
	return { ...quiz, questions };
}

function started(quiz: Quiz, attempt = createAttempt(quiz.questions)) {
	const state = workspaceReducer(
		{ quizzes: [quiz] },
		{ type: "startAttempt", quizId: quiz.id, attempt },
	);
	return { state, quizId: quiz.id };
}

function send(
	state: WorkspaceState,
	quizId: string,
	action: Parameters<typeof updateAttempt>[1],
) {
	return workspaceReducer(state, { type: "attempt", quizId, action });
}

function submitAllTrue(state: WorkspaceState, quizId: string, at = SUBMIT_AT) {
	let next = state;
	for (const q of state.quizzes[0].attempt?.questions ?? []) {
		if (q.format !== "true-false") continue;
		next = send(next, quizId, {
			type: "answer",
			questionId: q.id,
			response: true,
		});
	}
	return send(next, quizId, { type: "submit", at });
}

function named(...names: string[]): Quiz[] {
	return names.map((name) => createQuiz(parsedFile, name, NOW));
}

test("submitting records one entry dated at submission", () => {
	const quiz = quizWith([tf(1), tf(2)]);
	const { state, quizId } = started(quiz);
	const done = submitAllTrue(state, quizId);
	const [entry] = done.quizzes[0].history;
	expect(done.quizzes[0].history).toHaveLength(1);
	expect(entry.submittedAt).toBe(SUBMIT_AT);
	expect(entry.totalQuestions).toBe(2);
	expect(entry.questionCount).toBe(2);
	expect(entry.id).toBe(done.quizzes[0].attempt?.id);
});

test("a short attempt counts as normal", () => {
	const quiz = quizWith([1, 2, 3, 4, 5, 6, 7].map((n) => tf(n)));
	const { state, quizId } = started(
		quiz,
		createAttempt(quiz.questions, Math.random, 3),
	);
	const [entry] = submitAllTrue(state, quizId).quizzes[0].history;
	expect(entry.questionCount).toBe(3);
	expect(entry.totalQuestions).toBe(7);
	expect(entry.isRetry).toBe(false);
	expect(quizStats([entry]).attempts).toBe(1);
});

test("pending attempt records nothing until the last assessment", () => {
	const quiz = quizWith([tf(1), shortAnswer(2)]);
	const { state, quizId } = started(quiz);
	let next = send(state, quizId, {
		type: "answer",
		questionId: "q:2",
		response: "my answer",
	});
	next = submitAllTrue(next, quizId, SUBMIT_AT);
	expect(next.quizzes[0].history).toEqual([]);
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:2",
		correct: true,
	});
	expect(next.quizzes[0].history).toHaveLength(1);
	expect(next.quizzes[0].history[0].submittedAt).toBe(SUBMIT_AT);
	expect(next.quizzes[0].history[0].percentage).toBe(100);
});

test("all-unknown attempt records nothing", () => {
	const quiz = quizWith([tf(1, null)]);
	const { state, quizId } = started(quiz);
	const done = send(state, quizId, { type: "submit", at: SUBMIT_AT });
	expect(done.quizzes[0].history).toEqual([]);
});

test("changing an assessment updates the same entry", () => {
	const quiz = quizWith([shortAnswer(1)]);
	const { state, quizId } = started(quiz);
	let next = send(state, quizId, {
		type: "answer",
		questionId: "q:1",
		response: "x",
	});
	next = send(next, quizId, { type: "submit", at: SUBMIT_AT });
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:1",
		correct: true,
	});
	expect(next.quizzes[0].history[0].percentage).toBe(100);
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:1",
		correct: false,
	});
	expect(next.quizzes[0].history).toHaveLength(1);
	expect(next.quizzes[0].history[0].percentage).toBe(0);
});

test("changing an assessment after reset scores adds nothing", () => {
	const quiz = quizWith([shortAnswer(1)]);
	const { state, quizId } = started(quiz);
	let next = send(state, quizId, {
		type: "answer",
		questionId: "q:1",
		response: "x",
	});
	next = send(next, quizId, { type: "submit", at: SUBMIT_AT });
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:1",
		correct: true,
	});
	next = workspaceReducer(next, { type: "resetScores", quizId });
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:1",
		correct: false,
	});
	expect(next.quizzes[0].history).toEqual([]);
});

test("retry entries are tagged", () => {
	const quiz = quizWith([tf(1)]);
	const retry = createAttempt(quiz.questions, Math.random, 1, true);
	const { state, quizId } = started(quiz, retry);
	const [entry] = submitAllTrue(state, quizId).quizzes[0].history;
	expect(entry.isRetry).toBe(true);
});

test("reset scores clears only that quiz and keeps its attempt", () => {
	const a = quizWith([tf(1)]);
	const b = { ...quizWith([tf(1)]), id: "other" };
	const { state, quizId } = started(a);
	const done = submitAllTrue(state, quizId);
	const both: WorkspaceState = {
		quizzes: [done.quizzes[0], { ...b, history: done.quizzes[0].history }],
	};
	const next = workspaceReducer(both, { type: "resetScores", quizId });
	expect(next.quizzes[0].history).toEqual([]);
	expect(next.quizzes[0].attempt).toBe(both.quizzes[0].attempt);
	expect(next.quizzes[1]).toBe(both.quizzes[1]);
});

test("delete removes the quiz with its attempt", () => {
	const a = quizWith([tf(1)]);
	const b = { ...quizWith([tf(1)]), id: "other" };
	const { state, quizId } = started(a);
	const next = workspaceReducer(
		{ quizzes: [state.quizzes[0], b] },
		{ type: "deleteQuiz", quizId },
	);
	expect(next.quizzes).toEqual([b]);
});

test("reset everything empties state", () => {
	const { state } = started(quizWith([tf(1)]));
	expect(workspaceReducer(state, { type: "resetEverything" })).toEqual({
		quizzes: [],
	});
});

test("rename trims, and ignores a blank name", () => {
	const quiz = createQuiz(parsedFile, "Old", NOW);
	const state: WorkspaceState = { quizzes: [quiz] };
	const renamed = workspaceReducer(state, {
		type: "renameQuiz",
		quizId: quiz.id,
		name: "  New  ",
	});
	expect(renamed.quizzes[0].name).toBe("New");
	const blank = workspaceReducer(state, {
		type: "renameQuiz",
		quizId: quiz.id,
		name: "   ",
	});
	expect(blank.quizzes[0].name).toBe("Old");
});

test("isValidName needs a non-blank name", () => {
	expect(isValidName("  a ")).toBe(true);
	expect(isValidName("   ")).toBe(false);
	expect(isValidName("")).toBe(false);
});

test("sort is A–Z, case-insensitive, numeric", () => {
	expect(
		sortedQuizzes(named("Ch 10", "ch 2", "Alpha")).map((q) => q.name),
	).toEqual(["Alpha", "ch 2", "Ch 10"]);
});

test("sortedQuizzes does not change the input order", () => {
	const input = named("b", "a");
	sortedQuizzes(input);
	expect(input.map((q) => q.name)).toEqual(["b", "a"]);
});

test("quizStatus", () => {
	const quiz = quizWith([tf(1), shortAnswer(2)]);
	expect(quizStatus(quiz)).toBe("none");
	const { state, quizId } = started(quiz);
	expect(quizStatus(state.quizzes[0])).toBe("active");
	let next = send(state, quizId, {
		type: "answer",
		questionId: "q:2",
		response: "x",
	});
	next = send(next, quizId, { type: "submit", at: SUBMIT_AT });
	expect(quizStatus(next.quizzes[0])).toBe("pending");
	next = send(next, quizId, {
		type: "assess",
		questionId: "q:2",
		correct: true,
	});
	expect(quizStatus(next.quizzes[0])).toBe("submitted");
});

test("totalAttempts sums counted attempts across quizzes", () => {
	const [a, b] = named("A", "B");
	const entry = (isRetry: boolean) => ({
		id: String(Math.random()),
		submittedAt: LATER,
		questionCount: 1,
		totalQuestions: 1,
		correct: 1,
		totalGradable: 1,
		percentage: 100,
		isRetry,
	});
	a.history = [entry(false), entry(true)];
	b.history = [entry(false), entry(false)];
	expect(totalAttempts([a, b])).toBe(3);
});

test("the source line follows a rename", () => {
	const quiz = createQuiz(parsedFile, "Old", NOW);
	const question = quiz.questions[0];
	const renamed = workspaceReducer(
		{ quizzes: [quiz] },
		{ type: "renameQuiz", quizId: quiz.id, name: "Fresh" },
	);
	expect(questionSource(question, renamed.quizzes)).toBe("Fresh");
	expect(questionSource({ ...question, quizId: "gone" }, renamed.quizzes)).toBe(
		"Question bank",
	);
});

test("question ids use the number from the file, not the position", () => {
	const gappy = `# Gaps
## Q2
- **Format:** true-false
- **Question:** Second?
- **Answer:** True
## Q5
- **Format:** true-false
- **Question:** Fifth?
- **Answer:** False
`;
	const parsedGappy = parseQuizFile(gappy, "gaps.md");
	if (!parsedGappy.ok) throw new Error(parsedGappy.errors.join("\n"));
	const quiz = createQuiz(parsedGappy, "Gaps", NOW);
	expect(quiz.questions.map((q) => q.id)).toEqual([
		`${quiz.id}:2`,
		`${quiz.id}:5`,
	]);
});
