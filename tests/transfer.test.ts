import { expect, test } from "vitest";
import { createAttempt } from "#/lib/attempt";
import { quizStats } from "#/lib/history";
import { type ParsedFile, parseQuizFile } from "#/lib/parser";
import {
	type HistoryEntry,
	type Question,
	type ResponseValue,
	type SessionReview,
	type WorkspaceState,
	workspaceStateSchema,
} from "#/lib/schema";
import {
	buildExport,
	type ExportFile,
	exportHasHistory,
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
			review: null,
			retryOf: null,
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

test("imported quizzes pass the saved-state schema", () => {
	const quizzes = quizzesFromExport(
		okQuizzes(parseExport(serializeExport(file))),
		NOW,
	);
	expect(workspaceStateSchema.safeParse({ quizzes }).success).toBe(true);
});

test("smuggled keys in an import are stripped", () => {
	const smuggled = structuredClone(file) as unknown as {
		quizzes: Record<string, unknown>[];
	};
	smuggled.quizzes[0].attempt = { status: "active" };
	const question = smuggled.quizzes[0].questions as Record<string, unknown>[];
	question[0].id = "stray-id";
	question[0].quizId = "stray-quiz";

	const quizzes = quizzesFromExport(
		okQuizzes(parseExport(JSON.stringify(smuggled))),
		NOW,
	);
	expect(quizzes[0].history).toEqual([]);
	expect(quizzes[0].attempt).toBeNull();
	expect(quizzes[0].questions[0].id).toBe(`${quizzes[0].id}:1`);
	expect(quizzes[0].questions[0].quizId).toBe(quizzes[0].id);
	expect(workspaceStateSchema.safeParse({ quizzes }).success).toBe(true);
});

test("malformed history in an import is rejected", () => {
	const smuggled = structuredClone(file) as unknown as {
		quizzes: Record<string, unknown>[];
	};
	smuggled.quizzes[0].history = [{ id: "fake" }];
	expect(parseExport(JSON.stringify(smuggled)).ok).toBe(false);
});

test("an export with an unsafe question number round-trips", () => {
	const text = `## Q9007199254740993\n- **Format:** true-false\n- **Question:** Big?\n- **Answer:** True\n`;
	const parsedBig = parseQuizFile(text, "big.md");
	if (!parsedBig.ok) throw new Error(parsedBig.errors.join("\n"));
	const big = createQuiz(parsedBig, "Big", NOW);
	expect(workspaceStateSchema.safeParse({ quizzes: [big] }).success).toBe(true);

	const exported = buildExport({ quizzes: [big] }, NOW);
	const back = quizzesFromExport(
		okQuizzes(parseExport(serializeExport(exported))),
		NOW,
	);
	expect(back[0].questions[0].number).toBe(big.questions[0].number);
	expect(workspaceStateSchema.safeParse({ quizzes: back }).success).toBe(true);
});

function buildReviewedState() {
	const quiz = createQuiz(parsed, "Week 1", NOW);
	const [first, second] = quiz.questions;
	const entry = (extra: Partial<HistoryEntry>): HistoryEntry => ({
		id: "h1",
		submittedAt: "2026-11-01T09:00:00.000Z",
		questionCount: 2,
		totalQuestions: quiz.questions.length,
		correct: 1,
		totalGradable: 2,
		percentage: 50,
		isRetry: false,
		review: null,
		retryOf: null,
		...extra,
	});
	const review: SessionReview = {
		order: [first.id, second.id],
		responses: { [first.id]: "A", [second.id]: ["A", "B"] },
		assessments: { [first.id]: true },
		flags: { [second.id]: true },
	};
	quiz.history = [
		entry({ review }),
		entry({
			id: "h2",
			submittedAt: "2026-11-02T09:00:00.000Z",
			percentage: 100,
			isRetry: true,
			retryOf: "h1",
			review: {
				order: [second.id],
				responses: { [second.id]: ["A", "C"] },
				assessments: {},
				flags: {},
			},
		}),
	];
	return { quizzes: [quiz] };
}

const reviewed = buildReviewedState();
const source = reviewed.quizzes[0];
const historyText = serializeExport(buildExport(reviewed, NOW, true));

type RawReview = {
	order: string[];
	responses: Record<string, unknown>;
	assessments: Record<string, boolean>;
	flags: Record<string, boolean>;
};
type RawFile = {
	quizzes: { history: { id: string; retryOf: string; review: RawReview }[] }[];
};

function editedFile(edit: (raw: RawFile) => void): string {
	const raw = JSON.parse(historyText) as RawFile;
	edit(raw);
	return JSON.stringify(raw);
}

function damaged(damage: (review: RawReview) => void): string {
	return editedFile((raw) => damage(raw.quizzes[0].history[0].review));
}

test("export without history has no history key", () => {
	expect(serializeExport(buildExport(reviewed, NOW))).not.toContain("history");
});

test("export refers to questions by number, not by id", () => {
	expect(historyText).not.toContain(source.id);
	const [entry] = JSON.parse(historyText).quizzes[0].history;
	expect(entry.review.order).toEqual(["1", "2"]);
	expect(entry.review.responses).toEqual({ 1: "A", 2: ["A", "B"] });
	expect(entry.review.assessments).toEqual({ 1: true });
	expect(entry.review.flags).toEqual({ 2: true });
});

test("export leaves unfinished sessions and the latest attempt out", () => {
	const quiz = { ...source, attempt: createAttempt(source.questions) };
	const text = serializeExport(buildExport({ quizzes: [quiz] }, NOW, true));
	expect(text).not.toContain("attempt");
});

test("round trip keeps entries, answers and retry links under new ids", () => {
	const [quiz] = quizzesFromExport(
		okQuizzes(parseExport(historyText)),
		NOW,
		true,
	);
	const [original] = source.history;
	const [entry, retry] = quiz.history;
	const [first, second] = quiz.questions;
	expect(quiz.id).not.toBe(source.id);
	expect(entry.id).toBe(original.id);
	expect(entry.percentage).toBe(original.percentage);
	expect(entry.submittedAt).toBe(original.submittedAt);
	expect(entry.review).toEqual({
		order: [first.id, second.id],
		responses: { [first.id]: "A", [second.id]: ["A", "B"] },
		assessments: { [first.id]: true },
		flags: { [second.id]: true },
	});
	expect(retry.retryOf).toBe(entry.id);
	expect(retry.review?.order).toEqual([second.id]);
	expect(quizStats(quiz.history)).toEqual(quizStats(source.history));
	expect(workspaceStateSchema.safeParse({ quizzes: [quiz] }).success).toBe(
		true,
	);
});

test("round trip keeps an entry with no saved answers", () => {
	const quiz = {
		...source,
		history: [{ ...source.history[0], review: null }],
	};
	const text = serializeExport(buildExport({ quizzes: [quiz] }, NOW, true));
	const [back] = quizzesFromExport(okQuizzes(parseExport(text)), NOW, true);
	expect(back.history).toEqual(quiz.history);
});

test("round trip keeps answers to a question with an unsafe number", () => {
	const text = `## Q9007199254740993\n- **Format:** true-false\n- **Question:** Big?\n- **Answer:** True\n`;
	const parsedBig = parseQuizFile(text, "big.md");
	if (!parsedBig.ok) throw new Error(parsedBig.errors.join("\n"));
	const big = createQuiz(parsedBig, "Big", NOW);
	const [question] = big.questions;
	big.history = [
		{
			...source.history[0],
			review: {
				order: [question.id],
				responses: { [question.id]: true },
				assessments: {},
				flags: {},
			},
		},
	];
	const exported = serializeExport(buildExport({ quizzes: [big] }, NOW, true));
	const [back] = quizzesFromExport(okQuizzes(parseExport(exported)), NOW, true);
	expect(back.history[0].review?.responses[back.questions[0].id]).toBe(true);
});

test("an entry whose saved answers don't fit the quiz still exports a valid file", () => {
	const [entry, retry] = source.history;
	const stray = { ...entry, review: { ...entry.review, order: ["gone:99"] } };
	const quiz = { ...source, history: [stray as HistoryEntry, retry] };
	const text = serializeExport(buildExport({ quizzes: [quiz] }, NOW, true));
	const [back] = quizzesFromExport(okQuizzes(parseExport(text)), NOW, true);
	expect(back.history[0].percentage).toBe(entry.percentage);
	expect(back.history[0].review).toBeNull();
	expect(back.history[1].review).not.toBeNull();
});

test("unticked import drops history from a file that has it", () => {
	const quizzes = quizzesFromExport(
		okQuizzes(parseExport(historyText)),
		NOW,
		false,
	);
	expect(quizzes[0].history).toEqual([]);
});

test("exportHasHistory is false for old files and empty history", () => {
	expect(exportHasHistory(okQuizzes(parseExport(serializeExport(file))))).toBe(
		false,
	);
	const empty = { quizzes: [{ ...source, history: [] }] };
	const text = serializeExport(buildExport(empty, NOW, true));
	expect(exportHasHistory(okQuizzes(parseExport(text)))).toBe(false);
	expect(exportHasHistory(okQuizzes(parseExport(historyText)))).toBe(true);
});

test.each<[string, (review: RawReview) => void]>([
	["a question the quiz lacks", (r) => r.order.push("999")],
	["a repeated question", (r) => r.order.push(r.order[0])],
	["a number written another way", (r) => r.order.push("03")],
	["a key outside the order", (r) => (r.flags["999"] = true)],
	["a response outside the order", (r) => (r.responses["3"] = true)],
	["an assessment outside the order", (r) => (r.assessments["3"] = true)],
	["a response of the wrong kind", (r) => (r.responses[r.order[0]] = 5)],
	["a choice the question lacks", (r) => (r.responses[r.order[0]] = "Z")],
])("history with %s is rejected as damaged", (_name, damage) => {
	const result = parseExport(damaged(damage));
	expect(result.ok).toBe(false);
	if (!result.ok) {
		expect(result.message).toBe(
			"This file isn't a Quiz Prep export, or it's damaged. Nothing was changed.",
		);
	}
});

test("repeated entry ids are rejected as damaged", () => {
	const text = editedFile((raw) => {
		raw.quizzes[0].history[1].id = raw.quizzes[0].history[0].id;
	});
	expect(parseExport(text).ok).toBe(false);
});

test("retryOf naming a missing session is accepted", () => {
	const text = editedFile((raw) => {
		raw.quizzes[0].history[1].retryOf = "missing";
	});
	expect(parseExport(text).ok).toBe(true);
});

function sampleResponse(question: Question): ResponseValue {
	switch (question.format) {
		case "single-choice":
			return question.options[0].id;
		case "multi-select":
			return [question.options[0].id];
		case "true-false":
			return false;
		case "fill-in-blank":
			return ["one", ""];
		case "short-answer":
			return "my answer";
		case "matching":
			return { [question.left[0].id]: question.right[0].id };
		case "ordering":
			return question.items.map((item) => item.id).reverse();
	}
}

test("answers of every format survive the round trip", () => {
	const quiz = createQuiz(parsed, "Week 1", NOW);
	const responses: Record<string, ResponseValue> = {};
	for (const question of quiz.questions) {
		responses[question.id] = sampleResponse(question);
	}
	const review = {
		order: quiz.questions.map((q) => q.id),
		responses,
		assessments: {},
		flags: {},
	};
	quiz.history = [{ ...source.history[0], review }];
	const text = serializeExport(buildExport({ quizzes: [quiz] }, NOW, true));
	const [back] = quizzesFromExport(okQuizzes(parseExport(text)), NOW, true);
	back.questions.forEach((question, index) => {
		expect(back.history[0].review?.responses[question.id]).toEqual(
			responses[quiz.questions[index].id],
		);
	});
});

test("a __proto__ key in a review is dropped on import", () => {
	const text = historyText.replace(
		'"flags": {',
		'"flags": {\n"__proto__": true,',
	);
	const [quiz] = quizzesFromExport(okQuizzes(parseExport(text)), NOW, true);
	const flags = quiz.history[0].review?.flags ?? {};
	expect(Object.getPrototypeOf(flags)).toBe(Object.prototype);
	expect(Object.keys(flags)).toEqual([quiz.questions[1].id]);
});
