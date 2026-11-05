import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { STORAGE_KEY, type StorageLike } from "#/lib/storage";
import { loadTheme, resolveTheme, saveTheme, THEME_KEY } from "#/lib/theme";
import { serializeExport } from "#/lib/transfer";

function storageWith(value: string | null): StorageLike {
	return {
		getItem: () => value,
		setItem: () => {},
	};
}

const blocked: StorageLike = {
	getItem() {
		throw new Error("blocked");
	},
	setItem() {
		throw new Error("blocked");
	},
};

test("the default is system, and junk values fall back to it", () => {
	expect(loadTheme(storageWith(null))).toBe("system");
	expect(loadTheme(storageWith("purple"))).toBe("system");
});

test("blocked storage neither throws nor loses the fallback", () => {
	expect(loadTheme(blocked)).toBe("system");
	expect(() => saveTheme(blocked, "dark")).not.toThrow();
});

test("a saved choice loads back", () => {
	const store = new Map<string, string>();
	const storage: StorageLike = {
		getItem: (key) => store.get(key) ?? null,
		setItem: (key, value) => void store.set(key, value),
	};
	for (const choice of ["system", "light", "dark"] as const) {
		saveTheme(storage, choice);
		expect(store.has(THEME_KEY)).toBe(true);
		expect(loadTheme(storage)).toBe(choice);
	}
});

test("system follows the device, and a fixed choice ignores it", () => {
	expect(resolveTheme("system", true)).toBe("dark");
	expect(resolveTheme("system", false)).toBe("light");
	expect(resolveTheme("light", true)).toBe("light");
	expect(resolveTheme("dark", false)).toBe("dark");
});

test("the script in index.html reads the same key", () => {
	expect(readFileSync("index.html", "utf8")).toContain(THEME_KEY);
});

test("the inline script sits in the head, before the module script", () => {
	const html = readFileSync("index.html", "utf8");
	const script = html.indexOf(THEME_KEY);
	expect(script).toBeGreaterThan(html.indexOf("<head>"));
	expect(script).toBeLessThan(html.indexOf("</head>"));
	expect(script).toBeLessThan(html.indexOf("/src/main.tsx"));
});

test("workspace reset and export leave the theme alone", () => {
	expect(THEME_KEY).not.toBe(STORAGE_KEY);
	const exported = serializeExport({
		format: "quiz-prep-export",
		version: 1,
		exportedAt: "2026-11-05T00:00:00.000Z",
		quizzes: [],
	});
	expect(exported).not.toContain("theme");
});
