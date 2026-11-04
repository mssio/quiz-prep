import { z } from "zod";
import { hasUniqueValues } from "#/lib/answer-checks";
import { checkAttempt } from "#/lib/attempt-checks";
import { questionContentSchema, questionSchema } from "#/lib/question-schema";

export { questionContentSchema, questionSchema };

export const responseValueSchema = z.union([
	z.string(),
	z.boolean(),
	z.array(z.string()),
	z.record(z.string(), z.string()),
]);

export const attemptSchema = z
	.object({
		id: z.string(),
		questions: z.array(questionSchema).min(1),
		order: z.array(z.string()),
		displayOrders: z.record(
			z.string(),
			z.array(z.union([z.string(), z.boolean()])),
		),
		responses: z.record(z.string(), responseValueSchema),
		flags: z.record(z.string(), z.boolean()),
		assessments: z.record(z.string(), z.boolean()),
		currentIndex: z.number().int(),
		status: z.enum(["active", "submitted"]),
		isRetry: z.boolean(),
		submittedAt: z.string().nullable(),
	})
	.superRefine((attempt, ctx) => {
		const message = checkAttempt(attempt);
		if (message === null) return;
		ctx.addIssue({ code: "custom", message });
	});

export const historyEntrySchema = z.object({
	id: z.string(),
	submittedAt: z.string(),
	questionCount: z.number().int(),
	totalQuestions: z.number().int(),
	correct: z.number().int(),
	totalGradable: z.number().int(),
	percentage: z.number(),
	isRetry: z.boolean(),
});

export const quizSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		filename: z.string(),
		title: z.string(),
		course: z.string(),
		questions: z.array(questionSchema).min(1),
		history: z.array(historyEntrySchema),
		attempt: attemptSchema.nullable(),
		addedAt: z.string(),
	})
	.superRefine((quiz, ctx) => {
		const foreign = quiz.questions.some(
			(question) => question.quizId !== quiz.id,
		);
		if (!foreign) return;
		ctx.addIssue({
			code: "custom",
			message: "every question must belong to its quiz",
			path: ["questions"],
		});
	});

export const workspaceStateSchema = z
	.object({ quizzes: z.array(quizSchema) })
	.superRefine((state, ctx) => {
		const ids = state.quizzes.map((quiz) => quiz.id);
		if (hasUniqueValues(ids)) return;
		ctx.addIssue({
			code: "custom",
			message: "quiz ids must be unique",
			path: ["quizzes"],
		});
	});

export type { Choice, Question, QuestionContent } from "#/lib/question-schema";
export type ResponseValue = z.infer<typeof responseValueSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
