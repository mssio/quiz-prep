import type { Question, ResponseValue } from "#/lib/schema";

export type QuestionProps<F extends Question["format"]> = {
	question: Extract<Question, { format: F }>;
	response: ResponseValue | undefined;
	displayOrder: (string | boolean)[];
	onAnswer: (response: ResponseValue) => void;
};

export function asStringList(response: ResponseValue | undefined): string[] {
	return Array.isArray(response) ? response : [];
}

export function asStringMap(
	response: ResponseValue | undefined,
): Record<string, string> {
	const isMap =
		typeof response === "object" &&
		response !== null &&
		!Array.isArray(response);
	return isMap ? response : {};
}

export function asText(response: ResponseValue | undefined): string {
	return typeof response === "string" ? response : "";
}
