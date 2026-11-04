import { expect, test } from "vitest";
import { answerText } from "#/lib/answer-text";
import { createAttempt, retryMissed, updateAttempt } from "#/lib/attempt";
import { gradeQuestion, isAnswered, summarize } from "#/lib/grading";
import type { Attempt, Question } from "#/lib/schema";
import { allFormatQuestions } from "./helpers";

const NOW = "2026-11-04T10:00:00.000Z";
const qs = allFormatQuestions();
const [single, multi, tf, blank, short, matching, ordering] = qs;

function submit(attempt: Attempt): Attempt {
	return updateAttempt(attempt, { type: "submit", at: NOW });
}

function answered(questions: Question[], responses: [Question, never][]) {
	let attempt = createAttempt(questions);
	for (const [q, response] of responses) {
		attempt = updateAttempt(attempt, {
			type: "answer",
			questionId: q.id,
			response,
		});
	}
	return attempt;
}

function finalisedAttemptWithOneMiss(): Attempt {
	const attempt = answered(
		[single, tf],
		[
			[single, "A" as never],
			[tf, false as never],
		],
	);
	return submit(attempt);
}

test("grades each objective format by identity and entire answer", () => {
	const cases: [Question, unknown, string][] = [
		[single, "A", "correct"],
		[single, "B", "incorrect"],
		[multi, ["C", "A"], "correct"],
		[multi, ["A"], "incorrect"],
		[multi, ["A", "C", "B"], "incorrect"],
		[tf, true, "correct"],
		[tf, false, "incorrect"],
		[blank, ["  dNs ", " IP "], "correct"],
		[blank, ["DNS", "wrong"], "incorrect"],
		[matching, { "1": "B", "2": "A" }, "correct"],
		[matching, { "1": "B" }, "incorrect"],
		[ordering, ["4", "1", "2", "3"], "correct"],
		[ordering, ["1", "2", "3", "4"], "incorrect"],
		[ordering, undefined, "incorrect"],
	];
	for (const [q, response, want] of cases) {
		expect(gradeQuestion(q, response as never).status).toBe(want);
	}
});

test("text grading normalizes whitespace but does not guess synonyms", () => {
	const q = { ...blank, answer: ["domain name"] } as Question;
	expect(gradeQuestion(q, [" DOMAIN   NAME "]).status).toBe("correct");
	expect(gradeQuestion(q, ["DNS"]).status).toBe("incorrect");
});

test("self assessment is explicit; empty text needs no assessment", () => {
	expect(gradeQuestion(short, "paraphrase").status).toBe("pending");
	expect(gradeQuestion(short, "paraphrase", true)).toEqual({
		status: "correct",
		selfAssessed: true,
	});
	expect(gradeQuestion(short, "paraphrase", false).status).toBe("incorrect");
	expect(gradeQuestion(short, "   ").status).toBe("incorrect");
	const keyless = { ...short, answer: null } as Question;
	expect(gradeQuestion(keyless, "anything").status).toBe("ungraded");
});

test("deterministic shuffle retains canonical questions and mappings", () => {
	const before = structuredClone(qs);
	const a = createAttempt(qs, () => 0);
	expect(new Set(a.order).size).toBe(7);
	expect(a.order).not.toEqual(qs.map((q) => q.id));
	expect(qs).toEqual(before);
	expect(new Set(a.displayOrders[single.id])).toEqual(new Set(["A", "B"]));
	expect(a.questions).toEqual(before);
	expect(a.status).toBe("active");
});

test("requested count selects distinct random questions from the pool", () => {
	const first = createAttempt(qs, () => 0, 3);
	const second = createAttempt(qs, () => 0.999, 3);
	expect(first.questions).toHaveLength(3);
	expect(new Set(first.questions.map((q) => q.id)).size).toBe(3);
	expect(first.order).toHaveLength(3);
	expect(first.questions.map((q) => q.id)).not.toEqual(
		second.questions.map((q) => q.id),
	);
	expect(
		first.questions.every((q) => qs.some((source) => source.id === q.id)),
	).toBe(true);
});

test("requested count must be a whole number within the pool size", () => {
	for (const count of [0, -1, 1.5, 8, Number.NaN, "3"]) {
		expect(() => createAttempt(qs, Math.random, count as number)).toThrow(
			RangeError,
		);
	}
	expect(createAttempt(qs, () => 0, 7).questions).toHaveLength(7);
});

test("actions save flags/responses, navigate, lock submitted answers", () => {
	const a = createAttempt(qs);
	const b = updateAttempt(a, {
		type: "answer",
		questionId: single.id,
		response: "A",
	});
	expect(a.responses[single.id]).toBeUndefined();
	expect(b.responses[single.id]).toBe("A");
	let c = updateAttempt(b, { type: "flag", questionId: single.id });
	c = updateAttempt(c, { type: "navigate", index: 3 });
	expect(c.flags[single.id]).toBe(true);
	expect(c.currentIndex).toBe(3);
	c = submit(c);
	expect(
		updateAttempt(c, { type: "answer", questionId: single.id, response: "B" }),
	).toEqual(c);
});

test("pending score completes after assessment and retries only missed questions", () => {
	let a = answered(
		[single, short, tf],
		[
			[single, "A" as never],
			[short, "paraphrase" as never],
			[tf, false as never],
		],
	);
	a = submit(a);
	expect(summarize(a).pending).toBe(1);
	expect(summarize(a).percentage).toBeNull();
	expect(retryMissed(a)).toBeNull();
	a = updateAttempt(a, { type: "assess", questionId: short.id, correct: true });
	expect(summarize(a).correct).toBe(2);
	expect(summarize(a).percentage).toBe((100 * 2) / 3);
	const retry = retryMissed(a);
	expect(retry?.questions.map((q) => q.id)).toEqual([tf.id]);
	expect(retry?.responses).toEqual({});
});

test("all unknown and all correct avoid misleading scores and retries", () => {
	const keyless = { ...single, answer: null } as Question;
	const a = submit(createAttempt([keyless]));
	expect(summarize(a).percentage).toBeNull();
	expect(summarize(a).totalGradable).toBe(0);
	expect(retryMissed(a)).toBeNull();
	const b = submit(answered([single], [[single, "A" as never]]));
	expect(summarize(b).percentage).toBe(100);
	expect(retryMissed(b)).toBeNull();
});

test("incomplete widgets and untouched ordering stay unanswered", () => {
	expect(isAnswered(ordering, undefined)).toBe(false);
	expect(isAnswered(blank, ["DNS", ""])).toBe(false);
	expect(isAnswered(matching, { "1": "B" })).toBe(false);
	expect(isAnswered(tf, false)).toBe(true);
	expect(isAnswered(short, "  ")).toBe(false);
	expect(isAnswered(ordering, ["4", "1", "2", "3"])).toBe(true);
});

test("submit records the time", () => {
	const a = submit(createAttempt(qs));
	expect(a.submittedAt).toBe(NOW);
	expect(a.status).toBe("submitted");
});

test("new attempts are not retries; retryMissed attempts are", () => {
	expect(createAttempt(qs).isRetry).toBe(false);
	expect(retryMissed(finalisedAttemptWithOneMiss())?.isRetry).toBe(true);
});

test("a retry of a retry stays a retry", () => {
	const retry = retryMissed(finalisedAttemptWithOneMiss());
	if (!retry) throw new Error("expected a retry");
	const answeredWrong = updateAttempt(retry, {
		type: "answer",
		questionId: tf.id,
		response: false,
	});
	const again = retryMissed(submit(answeredWrong));
	expect(again?.isRetry).toBe(true);
});

test("answerText shows a single fill-in-blank answer without a number", () => {
	const one = { ...blank, answer: ["0.35"] } as Question;
	expect(answerText(one, ["0.35"], true)).toBe("0.35");
	expect(answerText(one, [" "])).toBe("Not answered");
});

test("answerText", () => {
	expect(answerText(tf, false)).toBe("False");
	expect(answerText(single, undefined)).toBe("Not answered");
	const keyless = { ...single, answer: null } as Question;
	expect(answerText(keyless, null, true)).toBe("No answer key provided.");
	expect(answerText(multi, ["A", "C"])).toBe("One\nThree");
	expect(answerText(blank, ["DNS", " "])).toBe("1. DNS\n2. Not answered");
	expect(answerText(matching, { "1": "B" })).toBe(
		"First → One\nSecond → Not answered",
	);
	expect(answerText(ordering, ordering.answer, true)).toBe(
		"1. First\n2. Second\n3. Third\n4. Fourth",
	);
});
