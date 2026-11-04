export type Block = {
	number: number;
	fields: Record<string, string[]>;
	repeatedFields: string[];
};

export type ScanResult = {
	blocks: Block[];
	header: string;
	hasUnclosedFence: boolean;
};

export type ListEntry = { id: string; text: string };
export type ListKind = "letters" | "numbers";

type Fence = { char: string; length: number };

const fencePattern = /^(`{3,}|~{3,})/;
const headingPattern = /^##\s+Q(\d+)\s*$/;
const fieldPattern = /^\s*-\s+\*\*([\w -]+):\*\*\s*(.*)$/;
const letterItemPattern = /^\s*-\s+([A-Z])\.\s+(.+)$/;
const numberItemPattern = /^\s*(\d+)\.\s+(.+)$/;

export function normalizeText(text: string): string {
	return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

function nextFence(fence: Fence | null, marker: string): Fence | null {
	if (fence === null) return { char: marker[0], length: marker.length };
	const closes = marker[0] === fence.char && marker.length >= fence.length;
	return closes ? null : fence;
}

function startBlock(number: number): Block {
	return { number, fields: {}, repeatedFields: [] };
}

function startField(block: Block, label: string, firstLine: string): string {
	const name = label.toLowerCase();
	if (Object.hasOwn(block.fields, name)) block.repeatedFields.push(name);
	block.fields[name] = [firstLine];
	return name;
}

export function scanBlocks(text: string): ScanResult {
	const blocks: Block[] = [];
	const header: string[] = [];
	let current: Block | null = null;
	let field: string | null = null;
	let fence: Fence | null = null;

	function keepLine(line: string) {
		if (current && field) current.fields[field].push(line);
	}

	for (const line of text.split("\n")) {
		const fenceMarker = line.trim().match(fencePattern);
		if (fenceMarker) {
			fence = nextFence(fence, fenceMarker[1]);
			keepLine(line);
			continue;
		}
		if (fence) {
			keepLine(line);
			continue;
		}
		const heading = line.match(headingPattern);
		if (heading) {
			current = startBlock(Number(heading[1]));
			blocks.push(current);
			field = null;
			continue;
		}
		if (!current) {
			header.push(line);
			continue;
		}
		const label = line.match(fieldPattern);
		if (label) {
			field = startField(current, label[1], label[2]);
		} else {
			keepLine(line);
		}
	}
	return {
		blocks,
		header: header.join("\n"),
		hasUnclosedFence: fence !== null,
	};
}

export function parseList(
	raw: string | undefined,
	kind: ListKind,
): ListEntry[] {
	if (!raw?.trim()) return [];
	const pattern = kind === "letters" ? letterItemPattern : numberItemPattern;
	const entries: ListEntry[] = [];
	for (const line of raw.split("\n")) {
		if (!line.trim()) continue;
		const match = line.match(pattern);
		const last = entries.at(-1);
		if (match) {
			entries.push({ id: match[1], text: match[2] });
		} else if (last && /^\s+/.test(line)) {
			last.text += `\n${line.trim()}`;
		} else {
			throw new Error(
				"Invalid list item. Use lettered options or numbered items as specified.",
			);
		}
	}
	const ids = new Set(entries.map((entry) => entry.id));
	if (ids.size !== entries.length) {
		throw new Error("List item identifiers must be unique.");
	}
	return entries;
}
