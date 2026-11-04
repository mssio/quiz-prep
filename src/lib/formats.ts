import type { Question } from "#/lib/schema";

// "1 question", "2 questions". Pass the plural when adding "s" is wrong.
export function countLabel(
	amount: number,
	singular: string,
	plural = `${singular}s`,
): string {
	return `${amount} ${amount === 1 ? singular : plural}`;
}

export const formatNames: Record<Question["format"], string> = {
	"single-choice": "Single choice",
	"multi-select": "Multi-select",
	"true-false": "True / false",
	"fill-in-blank": "Fill in the blank",
	"short-answer": "Short answer",
	matching: "Matching",
	ordering: "Ordering",
};
