import { z } from "zod";
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

export const quizSchema = z.object({
	id: z.string(),
	name: z.string(),
	filename: z.string(),
	title: z.string(),
	course: z.string(),
	questions: z.array(questionSchema).min(1),
	history: z.array(historyEntrySchema),
	attempt: attemptSchema.nullable(),
	addedAt: z.string(),
});

export const workspaceStateSchema = z.object({ quizzes: z.array(quizSchema) });

export type Choice = { id: string; text: string };
export type QuestionContent = z.infer<typeof questionContentSchema>;
export type Question = z.infer<typeof questionSchema>;
export type ResponseValue = z.infer<typeof responseValueSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
