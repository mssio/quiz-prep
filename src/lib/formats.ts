import type { Question } from "#/lib/schema";

export const formatNames: Record<Question["format"], string> = {
	"single-choice": "Single choice",
	"multi-select": "Multi-select",
	"true-false": "True / false",
	"fill-in-blank": "Fill in the blank",
	"short-answer": "Short answer",
	matching: "Matching",
	ordering: "Ordering",
};
