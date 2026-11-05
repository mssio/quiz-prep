import { z } from "zod";
import { hasUniqueValues } from "#/lib/answer-checks";
import type { QuestionContent, Quiz, WorkspaceState } from "#/lib/schema";
import { questionContentSchema } from "#/lib/schema";
import {
	checkExportHistory,
	exportHistoryEntrySchema,
	fromExportHistory,
	toExportHistory,
} from "#/lib/transfer-history";
import { createQuiz } from "#/lib/workspace";

export const EXPORT_FILENAME = "quiz-prep-export.json";

const BAD_FILE_MESSAGE =
	"This file isn't a Quiz Prep export, or it's damaged. Nothing was changed.";

const exportQuizSchema = z
	.object({
		name: z.string(),
		filename: z.string(),
		title: z.string(),
		course: z.string(),
		questions: z.array(questionContentSchema).min(1),
		// Files from before history could be exported have none.
		history: z.array(exportHistoryEntrySchema).optional(),
	})
	.superRefine((quiz, ctx) => {
		if (quiz.name.trim() === "") {
			ctx.addIssue({
				code: "custom",
				message: "name is blank",
				path: ["name"],
			});
		}
		const numbers = quiz.questions.map((question) => question.number);
		if (!hasUniqueValues(numbers)) {
			ctx.addIssue({
				code: "custom",
				message: "question numbers must be unique",
				path: ["questions"],
			});
		}
		const message = checkExportHistory(quiz.questions, quiz.history ?? []);
		if (message !== null) {
			ctx.addIssue({ code: "custom", message, path: ["history"] });
		}
	});

const exportFileSchema = z.object({
	format: z.literal("quiz-prep-export"),
	version: z.literal(1),
	exportedAt: z.string(),
	quizzes: z.array(exportQuizSchema).min(1),
});

export type ExportQuiz = z.infer<typeof exportQuizSchema>;
export type ExportFile = z.infer<typeof exportFileSchema>;

export type ParseExportResult =
	| { ok: true; quizzes: ExportQuiz[] }
	| { ok: false; message: string };

// Questions keep their answer keys but lose the ids that tie them to this
// browser's quiz.
function toQuestionContent(
	question: Quiz["questions"][number],
): QuestionContent {
	const { id: _id, quizId: _quizId, ...content } = question;
	return content;
}

function toExportQuiz(quiz: Quiz, includeHistory: boolean): ExportQuiz {
	return {
		name: quiz.name,
		filename: quiz.filename,
		title: quiz.title,
		course: quiz.course,
		questions: quiz.questions.map(toQuestionContent),
		...(includeHistory && { history: toExportHistory(quiz) }),
	};
}

export function buildExport(
	state: WorkspaceState,
	exportedAt: string,
	includeHistory = false,
): ExportFile {
	return {
		format: "quiz-prep-export",
		version: 1,
		exportedAt,
		quizzes: state.quizzes.map((quiz) => toExportQuiz(quiz, includeHistory)),
	};
}

export function serializeExport(file: ExportFile): string {
	return JSON.stringify(file, null, 2);
}

function readJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

export function parseExport(text: string): ParseExportResult {
	const result = exportFileSchema.safeParse(readJson(text));
	if (!result.success) return { ok: false, message: BAD_FILE_MESSAGE };
	return { ok: true, quizzes: result.data.quizzes };
}

export function exportHasHistory(quizzes: ExportQuiz[]): boolean {
	return quizzes.some((quiz) => (quiz.history ?? []).length > 0);
}

export function quizzesFromExport(
	quizzes: ExportQuiz[],
	addedAt: string,
	includeHistory = false,
): Quiz[] {
	return quizzes.map((exported) => {
		const quiz = createQuiz(
			{ ok: true, ...exported },
			exported.name.trim(),
			addedAt,
		);
		if (!includeHistory || !exported.history) return quiz;
		return { ...quiz, history: fromExportHistory(exported.history, quiz.id) };
	});
}
