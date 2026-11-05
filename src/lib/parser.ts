import { normalizeText, scanBlocks } from "#/lib/markdown-blocks";
import { parseQuestion } from "#/lib/question-parser";
import type { QuestionContent } from "#/lib/schema";

export type ParsedFile = {
	ok: true;
	filename: string;
	title: string;
	course: string;
	questions: QuestionContent[];
};
export type RejectedFile = { ok: false; filename: string; errors: string[] };
export type ParseResult = ParsedFile | RejectedFile;

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function parseQuizFile(text: string, filename: string): ParseResult {
	const { blocks, header, hasUnclosedFence } = scanBlocks(normalizeText(text));
	const errors: string[] = [];
	const questions: QuestionContent[] = [];
	const seenNumbers = new Set<number>();

	if (blocks.length === 0) {
		errors.push(`${filename}: No questions found. Use headings such as ## Q1.`);
	}
	if (hasUnclosedFence) {
		const number = blocks.at(-1)?.number ?? 1;
		errors.push(`${filename}: Q${number}: Close the fenced code block.`);
	}
	for (const block of blocks) {
		try {
			if (seenNumbers.has(block.number)) {
				throw new Error("Question number is repeated within this file.");
			}
			seenNumbers.add(block.number);
			questions.push(parseQuestion(block));
		} catch (error) {
			errors.push(`${filename}: Q${block.number}: ${errorMessage(error)}`);
		}
	}
	if (errors.length) return { ok: false, filename, errors };

	const title = header.match(/^#\s+(.+)$/m)?.[1] || filename;
	const course = header.match(/\*\*Course:\*\*\s*(.+)/)?.[1] || "";
	return { ok: true, filename, title, course, questions };
}

export async function readUpload(file: {
	name: string;
	text(): Promise<string>;
}): Promise<ParseResult> {
	if (!file.name.toLowerCase().endsWith(".md")) {
		const errors = [`${file.name}: Choose a Markdown (.md) file.`];
		return { ok: false, filename: file.name, errors };
	}
	try {
		return parseQuizFile(await file.text(), file.name);
	} catch (error) {
		const errors = [`${file.name}: ${errorMessage(error)}`];
		return { ok: false, filename: file.name, errors };
	}
}
