import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MathText, renderMath } from "#/components/MathText";
import { hasMath, splitMath } from "#/lib/math-text";
import { parseQuizFile } from "#/lib/parser";
import mathFixture from "./fixtures/math.md?raw";

const math = (tex: string, display = false) => ({
	kind: "math",
	tex,
	display,
});
const text = (t: string) => ({ kind: "text", text: t });

test.each([
	["$\\bar{x}$ is", [math("\\bar{x}"), text(" is")]],
	["\\(a\\)", [math("a")]],
	["$$z = 1$$", [math("z = 1", true)]],
	["\\[z\\]", [math("z", true)]],
])("%s", (input, want) => expect(splitMath(input)).toEqual(want));

test.each([
	"salary is $62,400. This",
	"between $5 and $10",
	"$5-$10",
	"just a $",
	"$ spaced$",
	"$$unclosed",
	"use `$x$` here",
	"```\n$x$\n```",
])("%s stays plain", (input) => expect(hasMath(input)).toBe(false));

test("\\$ is a literal dollar", () =>
	expect(splitMath("\\$5 and $x$")).toEqual([text("$5 and "), math("x")]));

test("money before math", () =>
	expect(splitMath("$5 and $10 or $x$").at(-1)).toEqual(math("x")));

test("inline math does not cross lines", () =>
	expect(hasMath("$a\nb$")).toBe(false));

test("MathText escapes the plain parts", () => {
	const html = renderToStaticMarkup(<MathText text={"<img src=x> $x$"} />);
	expect(html).toContain("&lt;img");
	expect(html).toContain("katex");
});

test("broken LaTeX renders without throwing", () =>
	expect(renderMath("\\frac{", false)).toContain("katex-error"));

test("trust is off", () => {
	expect(renderMath("\\href{https://a.example}{x}", false)).not.toContain(
		"<a ",
	);
	expect(
		renderMath("\\includegraphics{https://a.example/x.png}", false),
	).not.toContain("<img");
});

test("math fixture imports", () =>
	expect(parseQuizFile(mathFixture, "math.md").ok).toBe(true));
