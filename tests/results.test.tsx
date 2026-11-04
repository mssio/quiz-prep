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

function review(question: Question, response: unknown): string {
	return renderToStaticMarkup(
		<ReviewItem
			question={question}
			index={0}
			attempt={submittedAttempt(question, response)}
			sourceName="Quiz"
			onAssess={() => {}}
		/>,
	);
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
