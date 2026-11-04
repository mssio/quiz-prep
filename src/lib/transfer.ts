import { z } from "zod";
import { hasUniqueValues } from "#/lib/answer-checks";
import type { QuestionContent, Quiz, WorkspaceState } from "#/lib/schema";
import { questionContentSchema } from "#/lib/schema";
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

function toExportQuiz(quiz: Quiz): ExportQuiz {
	return {
		name: quiz.name,
		filename: quiz.filename,
		title: quiz.title,
		course: quiz.course,
		questions: quiz.questions.map(toQuestionContent),
	};
}

export function buildExport(
	state: WorkspaceState,
	exportedAt: string,
): ExportFile {
	return {
		format: "quiz-prep-export",
		version: 1,
		exportedAt,
		quizzes: state.quizzes.map(toExportQuiz),
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

export function quizzesFromExport(
	quizzes: ExportQuiz[],
	addedAt: string,
): Quiz[] {
	return quizzes.map((quiz) =>
		createQuiz({ ok: true, ...quiz }, quiz.name.trim(), addedAt),
	);
}
