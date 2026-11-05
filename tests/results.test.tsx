import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ResultHero } from "#/components/results/ResultHero";
import { ReviewItem } from "#/components/results/ReviewItem";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import type { Summary } from "#/lib/grading";
import type { Attempt, Question } from "#/lib/schema";

const EMPTY: Summary = {
	correct: 0,
	incorrect: 0,
	pending: 0,
	ungraded: 0,
	totalGradable: 0,
	percentage: null,
	finalized: false,
};

function hero(overrides: Partial<Summary>): string {
	const summary = { ...EMPTY, ...overrides };
	return renderToStaticMarkup(<ResultHero summary={summary} />);
}

function submittedAttempt(question: Question, response: unknown): Attempt {
	const fresh = createAttempt([question]);
	const answered = updateAttempt(fresh, {
		type: "answer",
		questionId: question.id,
		response: response as never,
	});
	return updateAttempt(answered, {
		type: "submit",
		at: "2026-11-04T10:00:00Z",
	});
}

function review(
	question: Question,
	response: unknown,
	options: { readOnly?: boolean } = {},
): string {
	return renderToStaticMarkup(
		<ReviewItem
			question={question}
			index={0}
			view={submittedAttempt(question, response)}
			sourceName="Quiz"
			readOnly={options.readOnly}
			onAssess={options.readOnly ? undefined : () => {}}
		/>,
	);
}

function readOnlyReview(question: Question, response: unknown): string {
	return review(question, response, { readOnly: true });
}

function optionTexts(html: string): string[] {
	const matches = html.matchAll(
		/data-testid="option-text"[^>]*>([\s\S]*?)<\/span>/g,
	);
	return [...matches].map((m) => m[1].replace(/<[^>]*>/g, ""));
}

const shortAnswer: Question = {
	quizId: "q",
	id: "q:1",
	number: 1,
	format: "short-answer",
	prompt: "Define x",
	explanation: "",
	answer: "plain model answer",
};

const mathChoice: Question = {
	quizId: "q",
	id: "q:2",
	number: 2,
	format: "single-choice",
	prompt: "Pick",
	explanation: "",
	options: [
		{ id: "A", text: "$x^2$" },
		{ id: "B", text: "other" },
	],
	answer: "A",
};

test("hero wording follows the summary", () => {
	expect(hero({ pending: 1 })).toContain("PROVISIONAL RESULT");
	expect(hero({ pending: 1 })).toContain(
		"1 short-answer response need your assessment below.",
	);
	expect(hero({ totalGradable: 0 })).toContain("UNSCORED SESSION");
	expect(hero({ correct: 2, totalGradable: 2, percentage: 100 })).toContain(
		"All correct. Nicely done.",
	);
	expect(
		hero({ correct: 1, incorrect: 2, totalGradable: 3, percentage: 100 / 3 }),
	).toContain("33.3%");
});

test("typed answers stay plain text, chosen options render math", () => {
	const typed = review(shortAnswer, "$x$");
	expect(typed).toContain("$x$");
	expect(typed).not.toContain("katex");
	expect(review(mathChoice, "A")).toContain("katex");
});

test("pending items start open", () => {
	expect(review(shortAnswer, "my answer")).toMatch(/<details[^>]* open/);
	expect(review(mathChoice, "A")).not.toMatch(/<details[^>]* open/);
});

const plainChoice: Question = {
	quizId: "q",
	id: "q:3",
	number: 3,
	format: "single-choice",
	prompt: "Pick one",
	explanation: "",
	options: [
		{ id: "A", text: "alpha" },
		{ id: "B", text: "beta" },
		{ id: "C", text: "gamma" },
	],
	answer: "B",
};

const multi: Question = {
	quizId: "q",
	id: "q:4",
	number: 4,
	format: "multi-select",
	prompt: "Pick many",
	explanation: "",
	options: [
		{ id: "A", text: "one" },
		{ id: "B", text: "two" },
		{ id: "C", text: "three" },
	],
	answer: ["A", "C"],
};

const trueFalseQuestion: Question = {
	quizId: "q",
	id: "q:5",
	number: 5,
	format: "true-false",
	prompt: "Sky is blue",
	explanation: "",
	answer: true,
};

test("a read-only item starts open, even when correct", () => {
	expect(readOnlyReview(plainChoice, "B")).toContain("<details open");
});

test("a read-only short answer shows its assessment with no way to change it", () => {
	const attempt = {
		...submittedAttempt(shortAnswer, "my answer"),
		assessments: { [shortAnswer.id]: false },
	};
	const html = renderToStaticMarkup(
		<ReviewItem
			question={shortAnswer}
			index={0}
			view={attempt}
			sourceName="Quiz"
			readOnly
		/>,
	);
	expect(html).toContain("Incorrect");
	expect(html).not.toContain("<button");
});

test("an unanswered question shows Not answered", () => {
	const html = renderToStaticMarkup(
		<ReviewItem
			question={plainChoice}
			index={0}
			view={{ ...submittedAttempt(plainChoice, "B"), responses: {} }}
			sourceName="Quiz"
			readOnly
		/>,
	);
	expect(html).toContain("Not answered");
});

test("choice questions list every option in file order with word markers", () => {
	const html = review(plainChoice, "C");
	expect(optionTexts(html)).toEqual(["alpha", "beta", "gamma"]);
	expect(html).toContain('data-testid="option-list"');
	expect(html).toContain("Your answer");
	expect(html).toContain("Correct");
});

test("a picked correct option carries both markers", () => {
	const html = review(plainChoice, "B");
	const item = html.slice(html.indexOf("beta"));
	const end = item.indexOf("</li>");
	expect(item.slice(0, end)).toContain("Your answer");
	expect(item.slice(0, end)).toContain("Correct");
});

test("multi-select lists every option and marks each picked one", () => {
	const html = review(multi, ["A", "B"]);
	expect(optionTexts(html)).toEqual(["one", "two", "three"]);
});

test("a choice question with no answer key shows no Correct marker", () => {
	const html = review({ ...plainChoice, answer: null }, "A");
	expect(optionTexts(html)).toEqual(["alpha", "beta", "gamma"]);
	expect(html).not.toContain('data-marker="correct"');
});

test("other formats have no option list", () => {
	expect(review(trueFalseQuestion, true)).not.toContain(
		'data-testid="option-list"',
	);
});
