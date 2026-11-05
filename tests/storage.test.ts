import { expect, test } from "vitest";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import {
	backfillReviews,
	historyEntryFor,
	quizStats,
	reviewOf,
} from "#/lib/history";
import { parseQuizFile } from "#/lib/parser";
import type { Attempt, HistoryEntry, Quiz, WorkspaceState } from "#/lib/schema";
import {
	loadState,
	type StorageLike,
	saveState,
	storageStatus,
} from "#/lib/storage";
import { createQuiz } from "#/lib/workspace";
import allFormats from "./fixtures/all-formats.md?raw";

const NOW = "2026-11-04T10:00:00.000Z";
const parsed = parseQuizFile(allFormats, "all.md");
if (!parsed.ok) throw new Error(parsed.errors.join("\n"));

const quiz = createQuiz(parsed, "All formats", NOW);
quiz.attempt = createAttempt(quiz.questions);
const state: WorkspaceState = { quizzes: [quiz] };

type MemoryStorage = StorageLike & { value: string | null };

function memory(value: string | null = null): MemoryStorage {
	return {
		value,
		getItem() {
			return this.value;
		},
		setItem(_key, next) {
			this.value = next;
		},
	};
}

test("roundtrip preserves a fully populated submitted session", () => {
	const saved = structuredClone(state);
	const target = saved.quizzes[0];
	const short = target.questions[4];
	const actions = [
		{ type: "answer", questionId: short.id, response: "answer" },
		{ type: "flag", questionId: short.id },
		{ type: "navigate", index: 4 },
		{ type: "submit", at: NOW },
		{ type: "assess", questionId: short.id, correct: true },
	] as const;
	let attempt = createAttempt(target.questions);
	for (const action of actions) {
		attempt = updateAttempt(attempt, action);
	}
	target.attempt = attempt;
	const storage = memory();
	expect(saveState(storage, saved).ok).toBe(true);
	expect(loadState(storage).state).toEqual(saved);
});

test("empty storage is an empty workspace without warnings", () => {
	expect(loadState(memory())).toEqual({ state: null, message: "" });
});

const wrongKind = structuredClone(state);
const multiSelect = wrongKind.quizzes[0].questions[1];
// biome-ignore lint/style/noNonNullAssertion: the fixture always has an attempt
wrongKind.quizzes[0].attempt!.responses[multiSelect.id] = "not a list" as never;

const rejected: [string, string][] = [
	["invalid JSON", "{"],
	["wrong version", JSON.stringify({ version: 2, state })],
	[
		"invalid references",
		JSON.stringify({
			version: 1,
			state: {
				quizzes: [
					{ ...quiz, attempt: { ...quiz.attempt, order: ["nonexistent"] } },
				],
			},
		}),
	],
	[
		"invalid question",
		JSON.stringify({
			version: 1,
			state: { quizzes: [{ ...quiz, questions: [{}] }] },
		}),
	],
	[
		"attempt with a response of the wrong kind",
		JSON.stringify({ version: 1, state: wrongKind }),
	],
];

test.each(rejected)("%s is rejected without overwriting", (_name, raw) => {
	const storage = memory(raw);
	const result = loadState(storage);
	expect(result.state).toBeNull();
	expect(result.message).not.toBe("");
	expect(storage.value).toBe(raw);
});

function finished(response: boolean): Attempt {
	const questionId = quiz.questions[2].id;
	const actions = [
		{ type: "answer", questionId, response },
		{ type: "flag", questionId },
		{ type: "submit", at: NOW },
	] as const;
	return actions.reduce(updateAttempt, createAttempt(quiz.questions));
}

function entryFor(attempt: Attempt): HistoryEntry {
	const entry = historyEntryFor(attempt, quiz.questions.length);
	if (!entry) throw new Error("expected a history entry");
	return entry;
}

const older = finished(false);
const latest = finished(true);
const reviewed: Quiz = {
	...quiz,
	attempt: latest,
	history: [entryFor(older), entryFor(latest)],
};
const unreviewed: WorkspaceState = {
	quizzes: [
		{
			...reviewed,
			history: reviewed.history.map((entry) => ({ ...entry, review: null })),
		},
	],
};

// What a browser saved before reviews existed: none of the new fields.
function oldSave(): string {
	const { retryOf: _attemptRetryOf, ...attempt } = latest;
	const history = reviewed.history.map(
		({ review: _review, retryOf: _retryOf, ...entry }) => entry,
	);
	const quizzes = [{ ...reviewed, attempt, history }];
	return JSON.stringify({ version: 1, state: { quizzes } });
}

test("a save from before session review loads with default fields", () => {
	const statsBefore = quizStats(reviewed.history);
	const { state, message } = loadState(memory(oldSave()));
	expect(message).toBe("");
	if (!state) throw new Error("expected a loaded state");
	expect(state.quizzes[0].history[0].review).toBeNull();
	expect(state.quizzes[0].history[0].retryOf).toBeNull();
	expect(state.quizzes[0].attempt?.retryOf).toBeNull();
	expect(quizStats(state.quizzes[0].history)).toEqual(statsBefore);
});

test("loading backfills the latest finalized attempt only", () => {
	const { state } = loadState(memory(oldSave()));
	expect(state?.quizzes[0].history[0].review).toBeNull();
	expect(state?.quizzes[0].history[1].review?.responses).toEqual(
		latest.responses,
	);
});

test("backfill sets only the review", () => {
	const [, entry] = unreviewed.quizzes[0].history;
	const [, filled] = backfillReviews(unreviewed).quizzes[0].history;
	expect(filled).toEqual({ ...entry, review: reviewOf(latest) });
});

test("backfill gives the same result when run twice", () => {
	const once = backfillReviews(unreviewed);
	expect(backfillReviews(once)).toEqual(once);
	expect(backfillReviews(once).quizzes[0]).toBe(once.quizzes[0]);
});

test("backfill keeps a review that already exists", () => {
	const review = { ...reviewOf(latest), responses: {} };
	const [first, second] = reviewed.history;
	const saved: WorkspaceState = {
		quizzes: [{ ...reviewed, history: [first, { ...second, review }] }],
	};
	const result = backfillReviews(saved);
	expect(result.quizzes[0].history[1].review).toEqual(review);
	expect(result.quizzes[0]).toBe(saved.quizzes[0]);
});

test("backfill skips an attempt that is not finalized", () => {
	const active = createAttempt(quiz.questions);
	const entry = { ...entryFor(latest), id: active.id, review: null };
	const saved: WorkspaceState = {
		quizzes: [{ ...quiz, attempt: active, history: [entry] }],
	};
	expect(backfillReviews(saved).quizzes[0]).toBe(saved.quizzes[0]);
});

test("a saved review and retry link load unchanged, even for unknown questions", () => {
	const review = { ...reviewOf(latest), order: ["not-in-this-quiz"] };
	const [first] = reviewed.history;
	const saved: WorkspaceState = {
		quizzes: [
			{
				...reviewed,
				attempt: null,
				history: [{ ...first, review, retryOf: "original" }],
			},
		],
	};
	const storage = memory();
	saveState(storage, saved);
	expect(loadState(storage)).toEqual({ state: saved, message: "" });
});

test("quota and access failures preserve memory state and produce a warning", () => {
	const snapshot = structuredClone(state);
	const storage: StorageLike = {
		getItem() {
			throw new Error("denied");
		},
		setItem() {
			throw new Error("quota");
		},
	};
	const saved = saveState(storage, state);
	expect(saved.ok).toBe(false);
	expect(saved.message).not.toBe("");
	expect(loadState(storage).message).not.toBe("");
	expect(state).toEqual(snapshot);
});

test("failed persistence changes every affirmative save label", () => {
	const failed = storageStatus(false);
	expect(failed.library).toMatch(/not saved/i);
	expect(failed.session).toMatch(/not saved/i);
	expect(storageStatus(true).session).toMatch(/saved/i);
});
