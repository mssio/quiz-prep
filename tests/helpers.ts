import { parseQuizFile } from "#/lib/parser";
import type { Question } from "#/lib/schema";
import allFormats from "./fixtures/all-formats.md?raw";

export function allFormatQuestions(): Question[] {
	const result = parseQuizFile(allFormats, "all.md");
	if (!result.ok) throw new Error(result.errors.join("\n"));
	return result.questions.map((content, i) => ({
		...content,
		quizId: "quiz-1",
		id: `quiz-1:${i + 1}`,
	}));
}
