import { expect, test, vi } from "vitest";
import { newId } from "#/lib/ids";
import { questionSchema } from "#/lib/schema";

const base = { id: "q", quizId: "z", number: 1, prompt: "P", explanation: "" };
const two = [
	{ id: "A", text: "a" },
	{ id: "B", text: "b" },
];
const single = { ...base, format: "single-choice", options: two, answer: "A" };
const multi = {
	...base,
	format: "multi-select",
	options: two,
	answer: ["A", "B"],
};
const trueFalse = { ...base, format: "true-false", answer: true };
const fill = { ...base, format: "fill-in-blank", answer: ["x"] };
const short = { ...base, format: "short-answer", answer: "text" };
const matching = {
	...base,
	format: "matching",
	left: [
		{ id: "1", text: "one" },
		{ id: "2", text: "two" },
	],
	right: two,
	answer: { "1": "B", "2": "A" },
};
const ordering = {
	...base,
	format: "ordering",
	items: [
		{ id: "1", text: "one" },
		{ id: "2", text: "two" },
	],
	answer: { "1": 2, "2": 1 },
};
const validQuestions = [
	single,
	multi,
	trueFalse,
	fill,
	short,
	matching,
	ordering,
];

test("every format parses and keeps id and quizId", () => {
	for (const q of validQuestions) expect(questionSchema.parse(q)).toEqual(q);
});

test.each([
	["single-choice answer not in options", { ...single, answer: "Z" }],
	["multi-select needs two letters", { ...multi, answer: ["A"] }],
	[
		"matching answer must cover every left item",
		{ ...matching, answer: { "1": "B" } },
	],
	[
		"matching answer must point at a right item",
		{ ...matching, answer: { "1": "Z", "2": "A" } },
	],
	[
		"ordering positions must be a permutation",
		{ ...ordering, answer: { "1": 1, "2": 1 } },
	],
	[
		"option ids must be unique",
		{
			...single,
			options: [
				{ id: "A", text: "x" },
				{ id: "A", text: "y" },
			],
		},
	],
])("%s is rejected", (_, bad) => {
	expect(questionSchema.safeParse(bad).success).toBe(false);
});

test("unknown answers (null) are valid for every format", () => {
	for (const q of validQuestions) {
		expect(questionSchema.safeParse({ ...q, answer: null }).success).toBe(true);
	}
});

test("newId works without crypto.randomUUID", () => {
	vi.stubGlobal("crypto", {
		getRandomValues: crypto.getRandomValues.bind(crypto),
	});
	expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
	expect(newId()).not.toBe(newId());
	vi.unstubAllGlobals();
});
