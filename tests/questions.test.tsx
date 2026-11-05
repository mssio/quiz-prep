import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { QuestionView } from "#/components/questions/QuestionView";
import type { Question, ResponseValue } from "#/lib/schema";
import { allFormatQuestions } from "./helpers";

const questions = allFormatQuestions();

function pick<F extends Question["format"]>(
	format: F,
): Extract<Question, { format: F }> {
	const found = questions.find((q) => q.format === format);
	if (!found) throw new Error(`no ${format} fixture`);
	return found as Extract<Question, { format: F }>;
}

function html(
	question: Question,
	displayOrder: (string | boolean)[] = [],
	response?: ResponseValue,
): string {
	return renderToStaticMarkup(
		<QuestionView
			question={question}
			response={response}
			displayOrder={displayOrder}
			onAnswer={() => {}}
		/>,
	);
}

test("choices follow displayOrder and get A, B letters by position", () => {
	const out = html(pick("single-choice"), ["B", "A"]);
	expect(out.indexOf("Second")).toBeLessThan(out.indexOf("First"));
	expect(out).toMatch(/>A<\/span>[\s\S]*Second[\s\S]*>B<\/span>[\s\S]*First/);
	expect(out).toContain('type="radio"');
});

test("the chosen single-choice option is checked", () => {
	expect(html(pick("single-choice"), ["A", "B"], "B")).toMatch(
		/checked=""[^>]*value="B"/,
	);
});

test("multi-select uses checkboxes and says to select all", () => {
	const out = html(pick("multi-select"), ["A", "B", "C"], ["A", "C"]);
	expect(out).toContain('type="checkbox"');
	expect(out).toContain("Select all that apply.");
});

test("true-false shows True and False in displayOrder", () => {
	const out = html(pick("true-false"), [false, true]);
	expect(out.indexOf(">False<")).toBeLessThan(out.indexOf(">True<"));
});

test("fill-in-blank labels: one blank 'Your answer', several 'Blank 1'", () => {
	const several = html(pick("fill-in-blank"));
	expect(several).toContain("Blank 1");
	expect(several).toContain("Blank 2");
	const one = html({ ...pick("fill-in-blank"), answer: ["DNS"] });
	expect(one).toContain("Your answer");
	expect(one).not.toContain("Blank 1");
});

test("short-answer shows the textarea and self-assess hint", () => {
	const out = html(pick("short-answer"), [], "my text");
	expect(out).toContain("<textarea");
	expect(out).toContain("my text");
	expect(out).toContain("Write your answer here…");
});

test("imported HTML in a prompt is escaped", () => {
	const out = html({
		...pick("short-answer"),
		prompt: "<script>alert(1)</script>",
	});
	expect(out).toContain("&lt;script");
	expect(out).not.toContain("<script>");
});

test("the prompt is an h2 inside a fieldset with a legend", () => {
	const out = html(pick("short-answer"));
	expect(out).toMatch(/<h2[^>]*>[\s\S]*Explain the concept/);
	expect(out).toContain("<fieldset");
	expect(out).toContain("Your answer</legend>");
});

test("matching without math keeps text in the dropdown", () => {
	expect(html(pick("matching"), ["A", "B"])).toContain(
		'<option value="A">Two</option>',
	);
});

test("matching with math lists rendered items and offers letters", () => {
	const matching = pick("matching");
	const out = html(
		{
			...matching,
			right: [
				{ id: "A", text: "$x$" },
				{ id: "B", text: "One" },
			],
		},
		["A", "B"],
	);
	expect(out).toContain("katex");
	expect(out).toMatch(/<option value="A">A<\/option>/);
});

test("ordering shows items in displayOrder with positions and 'Use this order'", () => {
	const ordering = pick("ordering");
	const ids = ordering.items.map((item) => item.id);
	const out = html(ordering, [...ids].reverse());
	const first = ordering.items[ids.length - 1].text;
	const last = ordering.items[0].text;
	expect(out.indexOf(first)).toBeLessThan(out.indexOf(last));
	expect(out).toContain("Use this order");
	expect(out).toContain("Drag the handles to arrange items.");
	expect(out).toMatch(/>1<\/span>/);
});
