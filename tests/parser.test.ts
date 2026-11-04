import { expect, test } from "vitest";
import { parseQuizFile, readUpload } from "#/lib/parser";
import allFormats from "./fixtures/all-formats.md?raw";
import chOneFixture from "./fixtures/ch-1-test.md?raw";
import ch1 from "./fixtures/examples/ch-1-test.md?raw";
import ch2 from "./fixtures/examples/ch-2-test.md?raw";
import ch3 from "./fixtures/examples/ch-3-test.md?raw";
import ch100 from "./fixtures/examples/chapter-1-questions-x-100.md?raw";

function parsed(text: string, filename: string) {
	const result = parseQuizFile(text, filename);
	if (!result.ok) throw new Error(result.errors.join("\n"));
	return result;
}

test("sample parses ten questions, numeric blank and item target positions", () => {
	const r = parsed(chOneFixture, "sample.md");
	expect(r.questions).toHaveLength(10);
	expect(r.questions[9].answer).toEqual(["360"]);
	expect(r.questions[7].answer).toEqual({ "1": 2, "2": 3, "3": 4, "4": 1 });
});

test("all seven formats keep typed answers and multiline explanation", () => {
	const q = parsed(allFormats, "all.md").questions;
	expect(new Set(q.map((x) => x.format)).size).toBe(7);
	expect(q[1].answer).toEqual(["A", "C"]);
	expect(q[2].answer).toBe(true);
	expect(q[5].answer).toEqual({ "1": "B", "2": "A" });
	expect(q[4].explanation).toMatch(/First line\.\n\s*Second line/);
});

test("BOM and CRLF parse identically to LF", () => {
	const crlf = `﻿${chOneFixture.replaceAll("\n", "\r\n")}`;
	expect(parsed(crlf, "a.md").questions).toEqual(
		parsed(chOneFixture, "a.md").questions,
	);
});

test("fenced heading and field text remain prompt data", () => {
	const text =
		"# Code\n## Q1\n- **Format:** short-answer\n- **Question:** Read this:\n```text\n## Q99\n- **Answer:** pretend\n```\n- **Answer:** real";
	const r = parsed(text, "code.md");
	expect(r.questions).toHaveLength(1);
	expect(r.questions[0].prompt).toMatch(/Q99/);
	expect(r.questions[0].answer).toBe("real");
});

test.each([
	["unknown format", allFormats.replace("single-choice", "bad-format")],
	["missing prompt", allFormats.replace("- **Question:** Choose first.", "")],
	[
		"invalid option reference",
		allFormats.replace("- **Answer:** A\n", "- **Answer:** Z\n"),
	],
	[
		"duplicate question",
		`${allFormats}\n${allFormats.slice(allFormats.indexOf("## Q1"), allFormats.indexOf("## Q2"))}`,
	],
	["duplicate option", allFormats.replace("  - B. Second", "  - A. Second")],
	["ordering not permutation", allFormats.replace("2, 3, 4, 1", "2, 2, 4, 1")],
	["incomplete matching", allFormats.replace("1-B, 2-A", "1-B")],
	[
		"blank mismatch",
		allFormats.replace(
			"____ translates names into ____",
			"____ translates names into",
		),
	],
])("%s rejects entire file with question location", (_, body) => {
	const r = parseQuizFile(body, "bad.md");
	expect(r.ok).toBe(false);
	if (!r.ok) expect(r.errors[0]).toMatch(/bad\.md.*Q\d/);
});

test("unknown answer is retained as null", () => {
	const text = allFormats.replace(
		"- **Answer:** A\n",
		"- **Answer:** unknown\n",
	);
	expect(parsed(text, "u.md").questions[0].answer).toBeNull();
});

test.each([
	["ch-1-test.md", ch1, 10],
	["ch-2-test.md", ch2, 10],
	["ch-3-test.md", ch3, 7],
	["chapter-1-questions-x-100.md", ch100, 83],
])("%s imports", (name, text, count) => {
	expect(parsed(text, name).questions).toHaveLength(count);
});

test("title falls back to the filename, course to empty", () => {
	const text =
		"## Q1\n- **Format:** true-false\n- **Question:** x\n- **Answer:** True\n";
	const r = parsed(text, "f.md");
	expect(r.title).toBe("f.md");
	expect(r.course).toBe("");
});

test("non-markdown upload is rejected with the old wording", async () => {
	const r = await readUpload({ name: "a.txt", text: async () => "" });
	expect(r).toEqual({
		ok: false,
		filename: "a.txt",
		errors: ["a.txt: Choose a Markdown (.md) file."],
	});
});

test("extension check ignores case", async () => {
	const r = await readUpload({
		name: "NOTES.MD",
		text: async () => allFormats,
	});
	expect(r.ok).toBe(true);
});

test("a file that cannot be read becomes a rejected result", async () => {
	const r = await readUpload({
		name: "a.md",
		text: async () => {
			throw new Error("nope");
		},
	});
	expect(r).toEqual({ ok: false, filename: "a.md", errors: ["a.md: nope"] });
});

test("an unclosed fence is reported against the last question", () => {
	const text =
		"## Q1\n- **Format:** true-false\n- **Question:** Is this fenced?\n```\ncode\n";
	const r = parseQuizFile(text, "a.md");
	expect(r).toEqual({
		ok: false,
		filename: "a.md",
		errors: expect.arrayContaining(["a.md: Q1: Close the fenced code block."]),
	});
});

test("a file without question headings says no questions were found", () => {
	const r = parseQuizFile("# Just a title\n\nSome notes.\n", "notes.md");
	expect(r).toEqual({
		ok: false,
		filename: "notes.md",
		errors: ["notes.md: No questions found. Use headings such as ## Q1."],
	});
});
