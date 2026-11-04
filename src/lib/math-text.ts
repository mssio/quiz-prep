import { type Fence, fencePattern, nextFence } from "#/lib/markdown-blocks";

export type MathPart =
	| { kind: "text"; text: string }
	| { kind: "math"; tex: string; display: boolean };

type Chunk = { code: boolean; text: string };

type Delimiter = { open: string; close: string; display: boolean };

const BACKSLASH_DELIMITERS: Delimiter[] = [
	{ open: "\\(", close: "\\)", display: false },
	{ open: "\\[", close: "\\]", display: true },
];

// Splits text into fenced code lines (never math) and everything else.
function splitFences(text: string): Chunk[] {
	const chunks: Chunk[] = [];
	let fence: Fence | null = null;
	for (const line of text.split("\n")) {
		const marker = line.trim().match(fencePattern);
		const insideFence = fence !== null || marker !== null;
		if (marker) fence = nextFence(fence, marker[1]);
		const withBreak = `${line}\n`;
		const last = chunks.at(-1);
		if (last && last.code === insideFence) {
			last.text += withBreak;
		} else {
			chunks.push({ code: insideFence, text: withBreak });
		}
	}
	const final = chunks.at(-1);
	if (final) final.text = final.text.slice(0, -1);
	return chunks;
}

function findUnescaped(text: string, target: string, from: number): number {
	for (let i = from; i < text.length; i++) {
		if (text[i] === "\\") {
			i++;
		} else if (text.startsWith(target, i)) {
			return i;
		}
	}
	return -1;
}

function isSpace(char: string | undefined): boolean {
	return char === undefined || /\s/.test(char);
}

// Pandoc rule: opening $ is followed by a non-space; closing $ follows a
// non-space and is not followed by a digit. Returns the closing index or -1.
function findInlineClose(text: string, open: number): number {
	if (isSpace(text[open + 1])) return -1;
	const lineEnd = text.indexOf("\n", open);
	const close = findUnescaped(text, "$", open + 1);
	if (close === -1 || (lineEnd !== -1 && close > lineEnd)) return -1;
	if (isSpace(text[close - 1])) return -1;
	if (/\d/.test(text[close + 1] ?? "")) return -1;
	return close;
}

function findCodeSpanEnd(text: string, start: number): number {
	let length = 0;
	while (text[start + length] === "`") length++;
	const ticks = "`".repeat(length);
	const close = text.indexOf(ticks, start + length);
	return close === -1 ? start + length : close + length;
}

class PartCollector {
	parts: MathPart[] = [];

	addText(text: string) {
		const last = this.parts.at(-1);
		if (last?.kind === "text") {
			last.text += text;
		} else if (text) {
			this.parts.push({ kind: "text", text });
		}
	}

	addMath(tex: string, display: boolean) {
		this.parts.push({ kind: "math", tex, display });
	}
}

function scanProse(text: string, out: PartCollector) {
	let i = 0;
	while (i < text.length) {
		i = scanAt(text, i, out);
	}
}

// Handles whatever starts at position i and returns the next position.
function scanAt(text: string, i: number, out: PartCollector): number {
	if (text.startsWith("\\$", i)) {
		out.addText("$");
		return i + 2;
	}
	for (const { open, close, display } of BACKSLASH_DELIMITERS) {
		if (!text.startsWith(open, i)) continue;
		const end = text.indexOf(close, i + open.length);
		if (end === -1) break;
		out.addMath(text.slice(i + open.length, end), display);
		return end + close.length;
	}
	if (text.startsWith("$$", i)) {
		const end = text.indexOf("$$", i + 2);
		if (end === -1 || end === i + 2) {
			out.addText("$$");
			return i + 2;
		}
		out.addMath(text.slice(i + 2, end), true);
		return end + 2;
	}
	if (text[i] === "$") {
		const close = findInlineClose(text, i);
		if (close === -1) {
			out.addText("$");
			return i + 1;
		}
		out.addMath(text.slice(i + 1, close), false);
		return close + 1;
	}
	if (text[i] === "`") {
		const end = findCodeSpanEnd(text, i);
		out.addText(text.slice(i, end));
		return end;
	}
	out.addText(text[i]);
	return i + 1;
}

export function splitMath(text: string): MathPart[] {
	const out = new PartCollector();
	for (const chunk of splitFences(text)) {
		if (chunk.code) {
			out.addText(chunk.text);
		} else {
			scanProse(chunk.text, out);
		}
	}
	return out.parts;
}

export function hasMath(text: string): boolean {
	return splitMath(text).some((part) => part.kind === "math");
}
