import { expect, test } from "vitest";
import { createAttempt } from "#/lib/attempt";
import { type ParsedFile, parseQuizFile } from "#/lib/parser";
import type { WorkspaceState } from "#/lib/schema";
import {
	buildExport,
	type ExportFile,
	parseExport,
	quizzesFromExport,
	serializeExport,
} from "#/lib/transfer";
import { createQuiz } from "#/lib/workspace";
import allFormats from "./fixtures/all-formats.md?raw";

const NOW = "2026-11-04T10:00:00.000Z";
const result = parseQuizFile(allFormats, "all.md");
if (!result.ok) throw new Error(result.errors.join("\n"));
const parsed: ParsedFile = result;

function buildState(): WorkspaceState {
	const first = createQuiz(parsed, "Week 1", NOW);
	const second = createQuiz(parsed, "Week 2", NOW);
	first.attempt = createAttempt(first.questions);
	first.history = [
		{
			id: "h1",
			submittedAt: NOW,
			questionCount: 3,
			totalQuestions: 3,
			correct: 2,
			totalGradable: 3,
			percentage: 66,
			isRetry: false,
		},
	];
	return { quizzes: [first, second] };
}

const state = buildState();
const file: ExportFile = buildExport(state, NOW);

function okQuizzes(result: ReturnType<typeof parseExport>) {
	if (!result.ok) throw new Error(result.message);
	return result.quizzes;
}

function withName(name: string) {
	const copy = structuredClone(file);
	copy.quizzes[0].name = name;
	return copy;
}

function withFirstAnswer(answer: string) {
	const copy = structuredClone(file);
	copy.quizzes[0].questions[0] = {
		...copy.quizzes[0].questions[0],
		answer,
	} as never;
	return copy;
}

function withDuplicateNumbers() {
	const copy = structuredClone(file);
	copy.quizzes[0].questions[1].number = copy.quizzes[0].questions[0].number;
	return copy;
}

test("export has questions and answer keys, and no scores or sessions", () => {
	const text = serializeExport(file);
	expect(text).not.toContain("history");
	expect(text).not.toContain("attempt");
	expect(text).not.toContain("quizId");
	expect(JSON.parse(text).quizzes[0].questions[0].answer).toBe("A");
});

test("export is indented by two spaces", () => {
	expect(serializeExport(file)).toContain('\n  "format": "quiz-prep-export"');
});

test("round trip keeps names and questions with fresh ids and empty history", () => {
	const result = parseExport(serializeExport(file));
	const quizzes = quizzesFromExport(okQuizzes(result), NOW);
	expect(quizzes.map((q) => q.name)).toEqual(state.quizzes.map((q) => q.name));
	expect(quizzes[0].id).not.toBe(state.quizzes[0].id);
	expect(quizzes[0].questions.map((q) => q.prompt)).toEqual(
		state.quizzes[0].questions.map((q) => q.prompt),
	);
	expect(quizzes[0].history).toEqual([]);
	expect(quizzes[0].attempt).toBeNull();
});

test.each([
	["not JSON", "{"],
	["other JSON", '{"hello":1}'],
	["wrong format", JSON.stringify({ ...file, format: "other" })],
	["wrong version", JSON.stringify({ ...file, version: 2 })],
	["no quizzes", JSON.stringify({ ...file, quizzes: [] })],
	["blank name", JSON.stringify(withName("  "))],
	["answer not in options", JSON.stringify(withFirstAnswer("Z"))],
	["repeated question numbers", JSON.stringify(withDuplicateNumbers())],
])("%s is rejected", (_, text) => {
	const result = parseExport(text);
	expect(result.ok).toBe(false);
	if (!result.ok) {
		expect(result.message).toBe(
			"This file isn't a Quiz Prep export, or it's damaged. Nothing was changed.",
		);
	}
});
