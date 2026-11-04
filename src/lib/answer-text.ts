import type { Choice, Question } from "#/lib/schema";

const NOT_ANSWERED = "Not answered";

function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	return Array.isArray(value) && value.length === 0;
}

function textOf(choices: Choice[], id: string | undefined): string | undefined {
	return choices.find((choice) => choice.id === id)?.text;
}

function numberedLines(lines: string[]): string {
	return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

function orderedIds(
	q: Question & { format: "ordering" },
	value: unknown,
	expected: boolean,
): string[] {
	if (!expected) return value as string[];
	const positions = value as Record<string, number>;
	const sorted = [...q.items].sort((a, b) => positions[a.id] - positions[b.id]);
	return sorted.map((item) => item.id);
}

// Turns a response (or, with expected=true, the answer key) into display text.
export function answerText(
	q: Question,
	value: unknown,
	expected = false,
): string {
	if (expected && q.answer === null) return "No answer key provided.";
	if (isEmpty(value)) return NOT_ANSWERED;
	switch (q.format) {
		case "single-choice":
			return textOf(q.options, value as string) ?? NOT_ANSWERED;
		case "multi-select":
			return (value as string[])
				.map((id) => textOf(q.options, id) ?? id)
				.join("\n");
		case "true-false":
			return value ? "True" : "False";
		case "fill-in-blank":
			return numberedLines(
				(value as string[]).map((text) => text.trim() || NOT_ANSWERED),
			);
		case "matching": {
			const picked = value as Record<string, string>;
			return q.left
				.map(
					(left) =>
						`${left.text} → ${textOf(q.right, picked[left.id]) ?? NOT_ANSWERED}`,
				)
				.join("\n");
		}
		case "ordering": {
			const ids = orderedIds(q, value, expected);
			return numberedLines(ids.map((id) => textOf(q.items, id) ?? id));
		}
		case "short-answer":
			return (value as string).trim() || NOT_ANSWERED;
	}
}
