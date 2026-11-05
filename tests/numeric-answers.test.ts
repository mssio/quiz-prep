import { expect, test } from "vitest";
import { gradeQuestion } from "#/lib/grading";
import type { Question } from "#/lib/schema";
import { allFormatQuestions } from "./helpers";

const blank = allFormatQuestions()[3];

function status(expected: string | string[], typed: string | string[]) {
	const answer = [expected].flat();
	const question = { ...blank, answer } as Question;
	return gradeQuestion(question, [typed].flat()).status;
}

test.each([
	["0.8", "0.80"],
	["0.8", ".8"],
	["0.80", "0.8"],
	["36", "36.0"],
	["1200", "1,200"],
	["1,200", "1200"],
	["-0.5", "-.5"],
])("stored %s accepts the same value written as %s", (expected, typed) => {
	expect(status(expected, typed)).toBe("correct");
});

test.each([
	["0.8", "80%"],
	["0.35", "35%"],
	["0.8", "80.0 %"],
	["80", "80%"],
	["80%", "80"],
	["80%", "0.8"],
	["80%", "80%"],
	["0.5%", "0.5%"],
])("stored %s accepts the percentage form %s", (expected, typed) => {
	expect(status(expected, typed)).toBe("correct");
});

test.each([
	["80", "0.8"],
	["0.8", "0.8%"],
	["0.5%", "0.5"],
])("stored %s rejects %s, a different quantity", (expected, typed) => {
	expect(status(expected, typed)).toBe("incorrect");
});

test.each([
	["0.66666667", "0.67"],
	["0.66666667", "0.667"],
	["0.66666667", "66.67%"],
	["0.66666667", "67%"],
	["0.67", "0.66666667"],
	["0.33", "0.333"],
	["12.345", "12.35"],
	["1.005", "1.01"],
	["-0.66666667", "-0.67"],
])("stored %s accepts the rounded form %s", (expected, typed) => {
	expect(status(expected, typed)).toBe("correct");
});

test.each([
	["0.66666667", "0.7"],
	["0.66666667", "1"],
	["0.66666667", "0.66"],
	["0.66666667", "0.68"],
	["0.8", "1"],
	["0.8", "0.84"],
	["36.5", "37"],
	["0.67", "0.7"],
])("stored %s rejects %s, which is too coarse or off", (expected, typed) => {
	expect(status(expected, typed)).toBe("incorrect");
});

test.each([
	["DNS", "dns", "correct"],
	["Layer 7", "layer 7.0", "incorrect"],
	["1,5", "1.5", "incorrect"],
	["0.8", "about 0.8", "incorrect"],
])("stored %s and typed %s stay text comparisons", (expected, typed, result) => {
	expect(status(expected, typed)).toBe(result);
});

test("every blank is compared by value", () => {
	expect(status(["0.8", "DNS"], ["80%", "dns"])).toBe("correct");
	expect(status(["0.8", "DNS"], ["80%", "ip"])).toBe("incorrect");
});
