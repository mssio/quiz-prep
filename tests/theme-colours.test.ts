import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const SRC = join(__dirname, "..", "src");
const CSS = readFileSync(join(SRC, "styles.css"), "utf8");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.tsx?$/.test(path) && !path.endsWith("routeTree.gen.ts")
			? [path]
			: [];
	});
}

const RAW_COLOUR =
	/#[0-9a-fA-F]{3,8}\b|\b(?:[a-z-]+:)*!?(?:bg|text|border|ring|fill|stroke|outline|from|to|via|divide|shadow|decoration|accent|caret)-(?:white|black)\b|\b(?:bg|text|border)-(?:gray|slate|zinc|neutral|stone|red|amber|green|blue|yellow|orange)-\d{2,3}\b|\brgba?\(|\bhsla?\(/;

function filesMatching(re: RegExp): string[] {
	return sourceFiles(SRC)
		.filter((file) => re.test(readFileSync(file, "utf8")))
		.map((file) => file.slice(SRC.length + 1))
		.sort();
}

function declarations(block: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of block.matchAll(
		/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
	)) {
		out[m[1]] = m[2].toLowerCase();
	}
	return out;
}

function blockAfter(marker: string): string {
	const start = CSS.lastIndexOf(marker);
	if (start < 0) return "";
	const open = CSS.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < CSS.length; i++) {
		if (CSS[i] === "{") depth++;
		if (CSS[i] === "}" && --depth === 0) return CSS.slice(open + 1, i);
	}
	return "";
}

function tokens(mode: "light" | "dark"): Record<string, string> {
	const light = declarations(blockAfter("@theme"));
	if (mode === "light") return light;
	return { ...light, ...declarations(blockAfter(':root[data-theme="dark"]')) };
}

function channel(v: number): number {
	const s = v / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
	const n = Number.parseInt(hex.slice(1), 16);
	return (
		0.2126 * channel((n >> 16) & 255) +
		0.7152 * channel((n >> 8) & 255) +
		0.0722 * channel(n & 255)
	);
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

// Each text token with every background it really appears on.
const PAGE_SURFACES = [
	"page",
	"surface",
	"faint",
	"sunken",
	"hover",
	"chip",
	"tint",
];
const PAIRS: [string, string][] = [
	// Body and heading text on every neutral surface.
	...["ink", "heading", "strong", "slate", "muted", "blue"].flatMap((text) =>
		PAGE_SURFACES.map((bg): [string, string] => [text, bg]),
	),
	["ink", "neutral-bg"],
	["muted", "neutral-bg"], // neutral status badge
	["muted", "track"], // progress labels beside the track
	["strong", "hover"],
	["blue", "info-bg"],
	// Option markers and the current-question button.
	["info-text", "info-bg"],
	["info-text", "surface"],
	["steel", "tint"],
	["steel", "surface"],
	// Option letters in choice and matching rows, selected or not.
	["subtle", "surface"],
	["subtle", "tint"],
	["subtle", "page"],
	// Success.
	["green", "success-bg"],
	["green", "surface"],
	["green", "sunken"],
	// Danger: badges, delete buttons, inline errors.
	["danger-text", "danger-bg"],
	["danger-text", "danger-hover"],
	["danger-text", "surface"],
	["danger-text", "hover"],
	["danger-text", "page"],
	// Warning, notices, flagged and retry badges.
	["amber", "warning-bg"],
	["amber", "surface"],
	["warning-strong", "warning-bg"],
	["warning-strong", "notice-bg"],
	["warning-strong", "callout-bg"],
	["ink", "callout-bg"],
	["muted", "callout-bg"],
	["muted", "notice-bg"],
	["ink", "notice-bg"],
	["amber", "notice-bg"],
	// Buttons and the top bar.
	["on-accent", "accent"],
	["on-accent", "accent-hover"],
	["on-accent", "navy"],
	["topbar-muted", "navy"],
	["gold", "navy"],
];

describe("colour tokens", () => {
	test("components use tokens, not raw colours", () => {
		expect(filesMatching(RAW_COLOUR)).toEqual([]);
	});

	test("every token in PAIRS is defined in both modes", () => {
		for (const mode of ["light", "dark"] as const) {
			const t = tokens(mode);
			const missing = PAIRS.flat().filter((name) => !t[name]);
			expect([...new Set(missing)]).toEqual([]);
		}
	});

	test("dark mode overrides the page and text tokens", () => {
		const light = tokens("light");
		const dark = tokens("dark");
		for (const name of ["page", "surface", "ink", "muted", "accent"]) {
			expect(dark[name], name).toBeDefined();
			expect(dark[name], name).not.toBe(light[name]);
		}
		expect(dark.navy).toBe(light.navy);
		expect(dark.gold).toBe(light.gold);
	});

	test.each([
		"light",
		"dark",
	] as const)("text meets 4.5:1 in %s mode", (mode) => {
		const t = tokens(mode);
		const failures = PAIRS.filter(([text, bg]) => t[text] && t[bg])
			.map(([text, bg]) => ({ text, bg, ratio: contrast(t[text], t[bg]) }))
			.filter((p) => p.ratio < 4.5)
			.map((p) => `${p.text} on ${p.bg}: ${p.ratio.toFixed(2)}`);
		expect(failures).toEqual([]);
	});
});
