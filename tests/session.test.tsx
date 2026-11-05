import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HistoryTable } from "#/components/quizzes/HistoryTable";
import { SessionPanel } from "#/components/quizzes/SessionPanel";
import { countLabel } from "#/lib/formats";
import type { HistoryEntry, Quiz } from "#/lib/schema";
import { parseCount, replaceCopy } from "#/lib/session";
import { allFormatQuestions } from "./helpers";

test.each([
	["3", 7, 3],
	["7", 7, 7],
	["0", 7, null],
	["8", 7, null],
	["1.5", 7, null],
	["", 7, null],
	["abc", 7, null],
])("parseCount(%s, %s)", (value, max, want) => {
	expect(parseCount(value, max)).toBe(want);
});

function entry(id: string, submittedAt: string, over: Partial<HistoryEntry>) {
	return {
		id,
		submittedAt,
		questionCount: 10,
		totalQuestions: 10,
		correct: 10,
		totalGradable: 10,
		percentage: 100,
		isRetry: false,
		...over,
	} satisfies HistoryEntry;
}

const older = entry("a", "2026-11-03T20:00:00.000Z", {});
const newerRetry = entry("b", "2026-11-04T09:00:00.000Z", {
	questionCount: 3,
	correct: 2,
	totalGradable: 3,
	percentage: 66.7,
	isRetry: true,
});

test("history is newest first, shows 'n of N' and tags retries", () => {
	const h = renderToStaticMarkup(
		<HistoryTable history={[older, newerRetry]} />,
	);
	expect(h.indexOf("Retry missed")).toBeLessThan(h.indexOf("10 of 10"));
	expect(h).toContain("3 of 10");
	expect(h.match(/Retry missed/g)).toHaveLength(1);
});

test("history shows an empty state without entries", () => {
	const h = renderToStaticMarkup(<HistoryTable history={[]} />);
	expect(h).toContain("No finished attempts yet.");
	expect(h).not.toContain("<table");
});

function quizWithQuestions(): Quiz {
	return {
		id: "quiz-1",
		name: "Ch 1",
		filename: "ch1.md",
		title: "",
		course: "",
		questions: allFormatQuestions(),
		history: [],
		attempt: null,
		addedAt: "2026-11-04T00:00:00.000Z",
	};
}

test("session panel defaults the count to the question total", () => {
	const quiz = quizWithQuestions();
	const h = renderToStaticMarkup(
		<SessionPanel quiz={quiz} saveOk onStart={() => {}} />,
	);
	expect(h).toContain(`value="${quiz.questions.length}"`);
	expect(h).toContain("Start quiz");
	expect(h).not.toContain("Choose a whole number");
});

test("start-confirm copy mentions the pending score only when pending", () => {
	const plain = replaceCopy(false);
	expect(plain).toBe(
		"This replaces the saved attempt and its answers. Your questions and score history will stay.",
	);
	expect(plain).not.toContain("pending");
	expect(replaceCopy(true)).toBe(`${plain} The pending score will be lost.`);
});

test("countLabel uses the singular for exactly one", () => {
	expect(countLabel(1, "question")).toBe("1 question");
	expect(countLabel(0, "question")).toBe("0 questions");
	expect(countLabel(12, "question")).toBe("12 questions");
	expect(countLabel(2, "quiz", "quizzes")).toBe("2 quizzes");
});
