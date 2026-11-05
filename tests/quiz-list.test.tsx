import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { QuizStatsBlock } from "#/components/quizzes/QuizStatsBlock";

function render(stats: {
	best: number | null;
	average: number | null;
	attempts: number;
}) {
	return renderToStaticMarkup(<QuizStatsBlock stats={stats} />);
}

test("stats show dashes with no attempts", () => {
	const html = render({ best: null, average: null, attempts: 0 });
	expect(html.match(/—/g)).toHaveLength(2);
	expect(html).toContain(">0<");
});

test("stats show best, average, attempts", () => {
	const html = render({ best: 90, average: 76, attempts: 5 });
	expect(html).toContain(">90%<");
	expect(html).toContain(">76%<");
	expect(html).toContain(">5<");
	expect(html).not.toContain("—");
});
