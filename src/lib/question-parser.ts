import { type Block, type ListEntry, parseList } from "#/lib/markdown-blocks";
import type { QuestionContent } from "#/lib/schema";

type Fields = Record<string, string>;

const formats = [
	"single-choice",
	"multi-select",
	"true-false",
	"fill-in-blank",
	"short-answer",
	"matching",
	"ordering",
];

function joinFields(block: Block): Fields {
	const fields: Fields = {};
	for (const [name, lines] of Object.entries(block.fields)) {
		fields[name] = lines.join("\n").trim();
	}
	return fields;
}

function splitTokens(answer: string): string[] {
	return answer.split(",").map((token) => token.trim());
}

function hasId(entries: ListEntry[], id: string): boolean {
	return entries.some((entry) => entry.id === id);
}

function readOptions(fields: Fields): ListEntry[] {
	const options = parseList(fields.options, "letters");
	if (options.length < 2) throw new Error("Provide at least two options.");
	return options;
}

function parseSingleChoiceAnswer(answer: string, options: ListEntry[]) {
	if (!hasId(options, answer)) {
		throw new Error("Answer must reference one listed option.");
	}
	return answer;
}

function parseMultiSelectAnswer(answer: string, options: ListEntry[]) {
	const tokens = splitTokens(answer);
	const allListed = tokens.every((token) => hasId(options, token));
	const allDifferent = new Set(tokens).size === tokens.length;
	if (tokens.length < 2 || !allDifferent || !allListed) {
		throw new Error(
			"Answer must reference at least two different listed options.",
		);
	}
	return tokens;
}

function parseTrueFalseAnswer(answer: string) {
	if (!/^(true|false)$/i.test(answer)) {
		throw new Error("Answer must be True or False.");
	}
	return answer.toLowerCase() === "true";
}

function parseFillInBlankAnswer(answer: string, prompt: string) {
	const entries = parseList(answer, "numbers");
	const inOrder = entries.every(
		(entry, index) => entry.id === String(index + 1),
	);
	if (entries.length === 0 || !inOrder) {
		throw new Error("Number blank answers consecutively starting at 1.");
	}
	const blanks = (prompt.match(/____/g) || []).length;
	if (blanks > 0 && blanks !== entries.length) {
		throw new Error("The blank count does not match the answer count.");
	}
	return entries.map((entry) => entry.text);
}

function parseMatchingAnswer(
	answer: string,
	left: ListEntry[],
	right: ListEntry[],
) {
	const pairs: Record<string, string> = {};
	for (const token of splitTokens(answer)) {
		const match = token.match(/^(\d+)\s*-\s*([A-Z])$/);
		const valid =
			match &&
			hasId(left, match[1]) &&
			hasId(right, match[2]) &&
			!Object.hasOwn(pairs, match[1]);
		if (!valid) {
			throw new Error(
				"Answer pairs must use valid, unique left items and listed right items.",
			);
		}
		pairs[match[1]] = match[2];
	}
	if (Object.keys(pairs).length !== left.length) {
		throw new Error("Provide an answer for every left item.");
	}
	return pairs;
}

function parseOrderingAnswer(answer: string, items: ListEntry[]) {
	const positions = splitTokens(answer).map(Number);
	const allValid = positions.every(
		(position) =>
			Number.isInteger(position) && position >= 1 && position <= items.length,
	);
	const allDifferent = new Set(positions).size === positions.length;
	if (positions.length !== items.length || !allDifferent || !allValid) {
		throw new Error(
			"Ordering answers must be a permutation of positions 1 through the item count.",
		);
	}
	const placed: Record<string, number> = {};
	items.forEach((item, index) => {
		placed[item.id] = positions[index];
	});
	return placed;
}

function isUnknown(answer: string): boolean {
	return answer.toLowerCase() === "unknown";
}

function buildContent(format: string, fields: Fields, number: number) {
	const base = {
		number,
		prompt: fields.question,
		explanation: fields.explanation || "",
	};
	const answer = fields.answer;
	const known = !isUnknown(answer);

	if (format === "single-choice") {
		const options = readOptions(fields);
		const parsed = known ? parseSingleChoiceAnswer(answer, options) : null;
		return { ...base, format, options, answer: parsed } as const;
	}
	if (format === "multi-select") {
		const options = readOptions(fields);
		const parsed = known ? parseMultiSelectAnswer(answer, options) : null;
		return { ...base, format, options, answer: parsed } as const;
	}
	if (format === "matching") {
		const left = parseList(fields.left, "numbers");
		const right = parseList(fields.right, "letters");
		if (!left.length || !right.length) {
			throw new Error("Both matching lists are required.");
		}
		const parsed = known ? parseMatchingAnswer(answer, left, right) : null;
		return { ...base, format, left, right, answer: parsed } as const;
	}
	if (format === "ordering") {
		const items = parseList(fields.items, "numbers");
		if (items.length < 2)
			throw new Error("Provide at least two items to order.");
		const parsed = known ? parseOrderingAnswer(answer, items) : null;
		return { ...base, format, items, answer: parsed } as const;
	}
	if (format === "true-false") {
		const parsed = known ? parseTrueFalseAnswer(answer) : null;
		return { ...base, format, answer: parsed } as const;
	}
	if (format === "fill-in-blank") {
		const parsed = known ? parseFillInBlankAnswer(answer, base.prompt) : null;
		return { ...base, format, answer: parsed } as const;
	}
	return {
		...base,
		format: "short-answer",
		answer: known ? answer : null,
	} as const;
}

export function parseQuestion(block: Block): QuestionContent {
	const fields = joinFields(block);
	if (block.repeatedFields.length) {
		throw new Error(`Repeated field: ${block.repeatedFields[0]}`);
	}
	if (!formats.includes(fields.format)) {
		throw new Error("Unsupported or missing Format.");
	}
	if (!fields.question) throw new Error("Question text is missing.");
	if (!fields.answer) {
		throw new Error(
			"Answer is missing. Use unknown if the source has no answer.",
		);
	}
	return buildContent(fields.format, fields, block.number);
}
