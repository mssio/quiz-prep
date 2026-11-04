import { expect, test } from "vitest";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import { parseQuizFile } from "#/lib/parser";
import type { WorkspaceState } from "#/lib/schema";
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
