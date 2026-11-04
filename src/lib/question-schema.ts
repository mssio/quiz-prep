import { z } from "zod";
import {
	checkMatching,
	checkMultiSelect,
	checkOrdering,
	checkSingleChoice,
	hasUniqueValues,
	reportIssue,
} from "#/lib/answer-checks";

export const choiceSchema = z.object({ id: z.string(), text: z.string() });

const choiceListSchema = z
	.array(choiceSchema)
	.refine((choices) => hasUniqueValues(choices.map((c) => c.id)), {
		message: "choice ids must be unique",
	});

const common = {
	number: z.number().int(),
	prompt: z.string().min(1),
	explanation: z.string(),
};

const singleChoice = z.object({
	...common,
	format: z.literal("single-choice"),
	options: choiceListSchema.min(2),
	answer: z.string().nullable(),
});

const multiSelect = z.object({
	...common,
	format: z.literal("multi-select"),
	options: choiceListSchema.min(2),
	answer: z.array(z.string()).nullable(),
});

const trueFalse = z.object({
	...common,
	format: z.literal("true-false"),
	answer: z.boolean().nullable(),
});

const fillInBlank = z.object({
	...common,
	format: z.literal("fill-in-blank"),
	answer: z.array(z.string()).min(1).nullable(),
});

const shortAnswer = z.object({
	...common,
	format: z.literal("short-answer"),
	answer: z.string().nullable(),
});

const matching = z.object({
	...common,
	format: z.literal("matching"),
	left: choiceListSchema.min(1),
	right: choiceListSchema.min(1),
	answer: z.record(z.string(), z.string()).nullable(),
});

const ordering = z.object({
	...common,
	format: z.literal("ordering"),
	items: choiceListSchema.min(2),
	answer: z.record(z.string(), z.number()).nullable(),
});

export const questionContentSchema = z
	.discriminatedUnion("format", [
		singleChoice,
		multiSelect,
		trueFalse,
		fillInBlank,
		shortAnswer,
		matching,
		ordering,
	])
	.superRefine((question, ctx) => {
		reportIssue(ctx, checkAnswer(question));
	});

export type Choice = z.infer<typeof choiceSchema>;
export type QuestionContent = z.infer<typeof questionContentSchema>;

function checkAnswer(question: QuestionContent): string | null {
	switch (question.format) {
		case "single-choice":
			return checkSingleChoice(question.options, question.answer);
		case "multi-select":
			return checkMultiSelect(question.options, question.answer);
		case "matching":
			return checkMatching(question.left, question.right, question.answer);
		case "ordering":
			return checkOrdering(question.items, question.answer);
		default:
			return null;
	}
}

export const questionSchema = questionContentSchema.and(
	z.object({ id: z.string(), quizId: z.string() }),
);

export type Question = z.infer<typeof questionSchema>;
