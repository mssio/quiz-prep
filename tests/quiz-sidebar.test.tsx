import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { QuizSidebar } from "#/components/QuizSidebar";
import { createAttempt, updateAttempt } from "#/lib/attempt";
import { finishCopy } from "#/lib/session";
import { allFormatQuestions } from "./helpers";

function attemptWithOneAnsweredOneFlagged() {
	const questions = allFormatQuestions();
	const fresh = createAttempt(questions);
	const ordered = { ...fresh, order: fresh.questions.map((q) => q.id) };
	const [first, second] = ordered.order;
	const firstQuestion = ordered.questions[0];
	if (firstQuestion.format !== "single-choice") throw new Error("fixture");
	const answered = updateAttempt(ordered, {
		type: "answer",
		questionId: first,
		response: firstQuestion.options[0].id,
	});
	return updateAttempt(answered, { type: "flag", questionId: second });
}

function render(saveOk: boolean) {
	return renderToStaticMarkup(
		<QuizSidebar
			attempt={attemptWithOneAnsweredOneFlagged()}
			saveOk={saveOk}
			onNavigate={() => {}}
			onFinish={() => {}}
		/>,
	);
}

test("navigator marks answered, flagged and current", () => {
	const html = render(true);
	expect(html).toContain('aria-current="step"');
	expect(html).toContain("Question 1, answered");
	expect(html).toContain("Question 2, unanswered, flagged");
	expect(html).toContain("1 of 7 answered");
});

test("save label follows storage status", () => {
	expect(render(true)).toContain("Saved in this browser");
	expect(render(false)).toContain("Not saved — keep this tab open");
});

test("finishCopy counts unanswered and flagged questions", () => {
	expect(finishCopy(attemptWithOneAnsweredOneFlagged())).toBe(
		"6 unanswered · 1 flagged for review. Once submitted, your answers are locked and your results are revealed.",
	);
});
